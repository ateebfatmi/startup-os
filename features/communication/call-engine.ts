import type { CallParticipant, MediaState, PeerState, SignalMessage } from "./types";
import type { SignalingTransport } from "./signaling";

type CallEngineEvents = {
  onParticipant: (participant: CallParticipant) => void;
  onParticipantChange: (id: string, patch: Partial<CallParticipant>) => void;
  onParticipantLeave: (id: string) => void;
};

export class CallEngine {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly names = new Map<string, string>();
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private displayTrack: MediaStreamTrack | null = null;
  private active = false;

  constructor(
    private readonly roomId: string,
    private readonly identity: { id: string; name: string },
    private readonly signaling: SignalingTransport,
    private readonly events: CallEngineEvents,
    private readonly iceServers: RTCIceServer[],
  ) {}

  async join(withVideo: boolean) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
    this.cameraTrack = this.localStream.getVideoTracks()[0] ?? null;
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
    if (this.cameraTrack) this.cameraTrack.enabled = enabled;
    const actual = Boolean(this.cameraTrack && enabled);
    this.events.onParticipantChange(this.identity.id, { cameraEnabled: actual });
    await this.send("media-state", undefined, { ...this.mediaState(), cameraEnabled: actual });
  }

  async startScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia || this.displayTrack) return;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = displayStream.getVideoTracks()[0];
    if (!track) return;
    this.displayTrack = track;
    track.addEventListener("ended", () => { void this.stopScreenShare(); }, { once: true });
    await Promise.all([...this.peers.values()].map((peer) => this.videoSender(peer)?.replaceTrack(track)));
    this.replaceLocalVideoTrack(track);
    this.events.onParticipantChange(this.identity.id, { stream: this.localStream, screenSharing: true });
    await this.send("media-state", undefined, this.mediaState());
  }

  async stopScreenShare() {
    const display = this.displayTrack;
    if (!display) return;
    this.displayTrack = null;
    await Promise.all([...this.peers.values()].map((peer) => this.videoSender(peer)?.replaceTrack(this.cameraTrack)));
    this.replaceLocalVideoTrack(this.cameraTrack);
    if (display.readyState !== "ended") display.stop();
    this.events.onParticipantChange(this.identity.id, { stream: this.localStream, screenSharing: false });
    await this.send("media-state", undefined, this.mediaState());
  }

  async leave() {
    if (this.active) await this.send("leave");
    this.active = false;
    this.peers.forEach((peer) => peer.close());
    this.peers.clear();
    this.displayTrack?.stop();
    this.displayTrack = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.cameraTrack = null;
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
      screenSharing: false,
      connectionState: "connected",
    };
  }

  private mediaState(): MediaState {
    return {
      microphoneEnabled: this.localStream?.getAudioTracks().some((track) => track.enabled) ?? false,
      cameraEnabled: Boolean(this.cameraTrack?.enabled),
      screenSharing: Boolean(this.displayTrack),
    };
  }

  private async handleSignal(message: SignalMessage) {
    if (!this.active || message.roomId !== this.roomId || message.sourceId === this.identity.id || (message.targetId && message.targetId !== this.identity.id)) return;
    this.names.set(message.sourceId, message.sourceName);
    if (message.type === "leave") { this.closePeer(message.sourceId); return; }
    if (message.type === "media-state") {
      const state = message.payload as Partial<MediaState>;
      this.events.onParticipantChange(message.sourceId, { microphoneEnabled: Boolean(state.microphoneEnabled), cameraEnabled: Boolean(state.cameraEnabled), screenSharing: Boolean(state.screenSharing) });
      return;
    }
    const peer = this.ensurePeer(message.sourceId, message.sourceName);
    if (message.type === "join") {
      await this.send("present", message.sourceId, this.mediaState());
      if (this.identity.id < message.sourceId) await this.createOffer(message.sourceId, peer);
    } else if (message.type === "present") {
      const state = message.payload as Partial<MediaState>;
      this.events.onParticipantChange(message.sourceId, { microphoneEnabled: Boolean(state.microphoneEnabled), cameraEnabled: Boolean(state.cameraEnabled), screenSharing: Boolean(state.screenSharing) });
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
    const peer = new RTCPeerConnection({ iceServers: this.iceServers });
    this.localStream?.getTracks().forEach((track) => peer.addTrack(track, this.localStream!));
    if (!this.localStream?.getVideoTracks().length) peer.addTransceiver("video", { direction: "sendrecv" });
    peer.onicecandidate = ({ candidate }) => { if (candidate) void this.send("ice", id, candidate.toJSON()); };
    peer.ontrack = ({ streams }) => {
      const stream = streams[0] ?? new MediaStream();
      this.events.onParticipant({ id, name, stream, isLocal: false, microphoneEnabled: true, cameraEnabled: stream.getVideoTracks().length > 0, screenSharing: false, connectionState: this.mapPeerState(peer.connectionState) });
    };
    peer.onconnectionstatechange = () => {
      const state = this.mapPeerState(peer.connectionState);
      this.events.onParticipantChange(id, { connectionState: state });
      if (peer.connectionState === "failed") peer.restartIce();
      if (peer.connectionState === "closed") this.closePeer(id);
    };
    this.peers.set(id, peer);
    this.events.onParticipant({ id, name, stream: null, isLocal: false, microphoneEnabled: true, cameraEnabled: false, screenSharing: false, connectionState: "connecting" });
    return peer;
  }

  private videoSender(peer: RTCPeerConnection) {
    return peer.getSenders().find((sender) => sender.track?.kind === "video")
      ?? peer.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video")?.sender;
  }

  private replaceLocalVideoTrack(track: MediaStreamTrack | null) {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach((current) => this.localStream?.removeTrack(current));
    if (track) this.localStream.addTrack(track);
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
