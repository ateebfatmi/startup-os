import type { CallParticipant, MediaState, PeerState, SignalMessage } from "./types";
import type { SignalingTransport } from "./signaling";

type CallEngineEvents = {
  onParticipant: (participant: CallParticipant) => void;
  onParticipantChange: (id: string, patch: Partial<CallParticipant>) => void;
  onParticipantLeave: (id: string) => void;
};

function getIceServers(): RTCIceServer[] {
  const fallback: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const configured = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (!configured) return fallback;
  try {
    const parsed = JSON.parse(configured) as unknown;
    return Array.isArray(parsed) ? parsed as RTCIceServer[] : fallback;
  } catch { return fallback; }
}

export class CallEngine {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly names = new Map<string, string>();
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;
  private active = false;

  constructor(
    private readonly roomId: string,
    private readonly identity: { id: string; name: string },
    private readonly signaling: SignalingTransport,
    private readonly events: CallEngineEvents,
  ) {}

  async join(withVideo: boolean) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    await this.signaling.connect((message) => { void this.handleSignal(message); });
    this.active = true;
    this.events.onParticipant(this.makeLocalParticipant());
    await this.send("join");
    return this.localStream;
  }

  async setMicrophone(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    this.events.onParticipantChange(this.identity.id, { microphoneEnabled: enabled });
    await this.send("media-state", undefined, this.mediaState());
  }

  async setCamera(enabled: boolean) {
    const tracks = this.localStream?.getVideoTracks() ?? [];
    tracks.forEach((track) => { track.enabled = enabled; });
    const actual = tracks.length > 0 && enabled;
    this.events.onParticipantChange(this.identity.id, { cameraEnabled: actual });
    await this.send("media-state", undefined, { ...this.mediaState(), cameraEnabled: actual });
  }

  async leave() {
    if (this.active) await this.send("leave");
    this.active = false;
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    await this.signaling.disconnect();
  }

  private makeLocalParticipant(): CallParticipant {
    return {
      id: this.identity.id,
      name: "You",
      stream: this.localStream,
      isLocal: true,
      microphoneEnabled: this.localStream?.getAudioTracks().some((track) => track.enabled) ?? false,
      cameraEnabled: this.localStream?.getVideoTracks().some((track) => track.enabled) ?? false,
      connectionState: "connected",
    };
  }

  private mediaState(): MediaState {
    return {
      microphoneEnabled: this.localStream?.getAudioTracks().some((track) => track.enabled) ?? false,
      cameraEnabled: this.localStream?.getVideoTracks().some((track) => track.enabled) ?? false,
    };
  }

  private async handleSignal(message: SignalMessage) {
    if (!this.active || message.roomId !== this.roomId || message.sourceId === this.identity.id || (message.targetId && message.targetId !== this.identity.id)) return;
    this.names.set(message.sourceId, message.sourceName);
    if (message.type === "leave") { this.closePeer(message.sourceId); return; }
    if (message.type === "media-state") {
      const state = message.payload as Partial<MediaState>;
      this.events.onParticipantChange(message.sourceId, { microphoneEnabled: Boolean(state.microphoneEnabled), cameraEnabled: Boolean(state.cameraEnabled) });
      return;
    }
    const peer = this.ensurePeer(message.sourceId, message.sourceName);
    if (message.type === "join") {
      await this.send("present", message.sourceId, this.mediaState());
      if (this.identity.id < message.sourceId) await this.createOffer(message.sourceId, peer);
    } else if (message.type === "present") {
      const state = message.payload as Partial<MediaState>;
      this.events.onParticipantChange(message.sourceId, { microphoneEnabled: Boolean(state.microphoneEnabled), cameraEnabled: Boolean(state.cameraEnabled) });
      if (this.identity.id < message.sourceId && peer.signalingState === "stable") await this.createOffer(message.sourceId, peer);
    } else if (message.type === "offer" && message.payload) {
      await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
      await this.flushCandidates(message.sourceId, peer);
      await peer.setLocalDescription(await peer.createAnswer());
      await this.send("answer", message.sourceId, peer.localDescription);
    } else if (message.type === "answer" && message.payload) {
      await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
      await this.flushCandidates(message.sourceId, peer);
    } else if (message.type === "ice" && message.payload) {
      if (!peer.remoteDescription) {
        this.pendingCandidates.set(message.sourceId, [...(this.pendingCandidates.get(message.sourceId) ?? []), message.payload as RTCIceCandidateInit]);
      } else {
        try { await peer.addIceCandidate(message.payload as RTCIceCandidateInit); } catch { /* Candidate may arrive after a peer has closed. */ }
      }
    }
  }

  private ensurePeer(id: string, name: string) {
    const existing = this.peers.get(id);
    if (existing) return existing;
    const peer = new RTCPeerConnection({ iceServers: getIceServers() });
    this.localStream?.getTracks().forEach((track) => peer.addTrack(track, this.localStream!));
    peer.onicecandidate = ({ candidate }) => { if (candidate) void this.send("ice", id, candidate.toJSON()); };
    peer.ontrack = ({ streams }) => {
      const stream = streams[0] ?? new MediaStream();
      this.events.onParticipant({ id, name, stream, isLocal: false, microphoneEnabled: true, cameraEnabled: stream.getVideoTracks().length > 0, connectionState: this.mapPeerState(peer.connectionState) });
    };
    peer.onconnectionstatechange = () => {
      const state = this.mapPeerState(peer.connectionState);
      this.events.onParticipantChange(id, { connectionState: state });
      if (peer.connectionState === "failed") peer.restartIce();
      if (peer.connectionState === "closed") this.closePeer(id);
    };
    this.peers.set(id, peer);
    this.events.onParticipant({ id, name, stream: null, isLocal: false, microphoneEnabled: true, cameraEnabled: false, connectionState: "connecting" });
    return peer;
  }

  private async createOffer(id: string, peer: RTCPeerConnection) {
    await peer.setLocalDescription(await peer.createOffer());
    await this.send("offer", id, peer.localDescription);
  }

  private async send(type: SignalMessage["type"], targetId?: string, payload?: unknown) {
    await this.signaling.send({ roomId: this.roomId, sourceId: this.identity.id, sourceName: this.identity.name, targetId, type, payload });
  }

  private closePeer(id: string) {
    this.peers.get(id)?.close();
    this.peers.delete(id);
    this.names.delete(id);
    this.pendingCandidates.delete(id);
    this.events.onParticipantLeave(id);
  }

  private async flushCandidates(id: string, peer: RTCPeerConnection) {
    const candidates = this.pendingCandidates.get(id) ?? [];
    this.pendingCandidates.delete(id);
    for (const candidate of candidates) {
      try { await peer.addIceCandidate(candidate); } catch { /* Ignore candidates from a superseded negotiation. */ }
    }
  }

  private mapPeerState(state: RTCPeerConnectionState): PeerState { return state; }
}
