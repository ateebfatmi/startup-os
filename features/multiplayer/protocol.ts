import { OFFICE_BOUNDS } from "@/features/virtual-office/collision";
import type { PlayerSnapshot } from "@/features/virtual-office/types";

export const NETWORK_RATE_HZ = 12;
export const STALE_PLAYER_MS = 15_000;
const MAX_NAME_LENGTH = 80;

export function isPlayerSnapshot(value: unknown): value is PlayerSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<PlayerSnapshot>;
  return (
    typeof snapshot.id === "string" && snapshot.id.length >= 4 && snapshot.id.length <= 100 &&
    typeof snapshot.name === "string" && snapshot.name.length >= 1 && snapshot.name.length <= MAX_NAME_LENGTH &&
    typeof snapshot.x === "number" && Number.isFinite(snapshot.x) && snapshot.x >= OFFICE_BOUNDS.minX && snapshot.x <= OFFICE_BOUNDS.maxX &&
    typeof snapshot.z === "number" && Number.isFinite(snapshot.z) && snapshot.z >= OFFICE_BOUNDS.minZ && snapshot.z <= OFFICE_BOUNDS.maxZ &&
    typeof snapshot.rotation === "number" && Number.isFinite(snapshot.rotation) && Math.abs(snapshot.rotation) <= Math.PI * 4 &&
    typeof snapshot.updatedAt === "number" && Number.isFinite(snapshot.updatedAt) &&
    typeof snapshot.color === "string" && /^#[0-9a-f]{6}$/i.test(snapshot.color)
  );
}

export function normalizeSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
  return {
    ...snapshot,
    name: snapshot.name.trim().slice(0, MAX_NAME_LENGTH),
    x: Math.max(OFFICE_BOUNDS.minX, Math.min(OFFICE_BOUNDS.maxX, snapshot.x)),
    z: Math.max(OFFICE_BOUNDS.minZ, Math.min(OFFICE_BOUNDS.maxZ, snapshot.z)),
    rotation: Math.atan2(Math.sin(snapshot.rotation), Math.cos(snapshot.rotation)),
  };
}

export function snapshotChanged(previous: PlayerSnapshot | null, current: PlayerSnapshot) {
  if (!previous) return true;
  return Math.hypot(current.x - previous.x, current.z - previous.z) > 0.015 || Math.abs(current.rotation - previous.rotation) > 0.025 || current.roomId !== previous.roomId;
}
