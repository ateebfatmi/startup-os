export type Vec2 = { x: number; z: number };

export type Collider = Vec2 & { width: number; depth: number; id: string };

export type InteractionKind = "projects" | "meeting" | "whiteboard" | "focus" | "ai_assistant";

export type InteractionZone = Vec2 & {
  id: string;
  label: string;
  hint: string;
  radius: number;
  kind: InteractionKind;
};

export type PlayerSnapshot = {
  id: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  updatedAt: number;
  color: string;
  roomId?: string;
};

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";
