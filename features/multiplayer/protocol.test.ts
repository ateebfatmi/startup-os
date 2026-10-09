import { describe, expect, it } from "vitest";
import { isPlayerSnapshot, normalizeSnapshot, snapshotChanged } from "./protocol";
import type { PlayerSnapshot } from "@/features/virtual-office/types";

const snapshot: PlayerSnapshot = {
  id: "player-123",
  name: "Ateeb",
  x: 1,
  z: 2,
  rotation: 0,
  updatedAt: 1_000,
  color: "#58a77b",
};

describe("multiplayer protocol", () => {
  it("accepts valid snapshots and rejects out-of-bounds payloads", () => {
    expect(isPlayerSnapshot(snapshot)).toBe(true);
    expect(isPlayerSnapshot({ ...snapshot, x: 100 })).toBe(false);
    expect(isPlayerSnapshot({ ...snapshot, color: "red" })).toBe(false);
  });

  it("normalizes names and rotations", () => {
    const normalized = normalizeSnapshot({ ...snapshot, name: "  Teammate  ", rotation: Math.PI * 3 });
    expect(normalized.name).toBe("Teammate");
    expect(normalized.rotation).toBeCloseTo(Math.PI);
  });

  it("rate limits stationary snapshots by ignoring insignificant change", () => {
    expect(snapshotChanged(snapshot, { ...snapshot, x: 1.005, updatedAt: 2_000 })).toBe(false);
    expect(snapshotChanged(snapshot, { ...snapshot, x: 1.1, updatedAt: 2_000 })).toBe(true);
  });
});
