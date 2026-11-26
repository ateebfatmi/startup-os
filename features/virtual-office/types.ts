export type Vec2 = { x: number; z: number };
export type Availability = "available" | "focus" | "do_not_disturb" | "away";

export type Collider = Vec2 & { width: number; depth: number; id: string };

export type InteractionKind = "projects" | "meeting" | "whiteboard" | "focus" | "ai_assistant" | "arcade";

export type InteractionZone = Vec2 & {
  id: string;
  label: string;
  hint: string;
  radius: number;
  kind: InteractionKind;
  isSpotlight?: boolean;
};

export type OfficeRoom = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  destination: Vec2;
  labelPosition: Vec2;
  isPrivate?: boolean;
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
  status?: Availability;
  isGhost?: boolean;
  isDancing?: boolean;
  claimedDeskIndex?: number | null;
  activeAppStatus?: string | null; // e.g. "VS Code", "Figma", "GitHub"
  inPhoneBooth?: boolean;
};

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";
