export type CallStatus = "idle" | "requesting_permission" | "joining" | "connected" | "error";
export type PeerState = "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed";

export type CallParticipant = {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal: boolean;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  connectionState: PeerState;
};

export type MediaState = { microphoneEnabled: boolean; cameraEnabled: boolean };

export type SignalMessage = {
  roomId: string;
  sourceId: string;
  sourceName: string;
  targetId?: string;
  type: "join" | "present" | "offer" | "answer" | "ice" | "media-state" | "leave";
  payload?: unknown;
};
