import { describe, expect, it } from "vitest";
import type { PlayerSnapshot } from "@/features/virtual-office/types";
import { computeProximityGroup } from "./use-proximity-audio";

const player = (id: string, x: number): PlayerSnapshot => ({ id, name: id, x, z: 0, rotation: 0, updatedAt: 1, color: "#58a77b" });

describe("proximity grouping", () => {
  it("forms the same deterministic room for every nearby member", () => {
    const players = [player("local-a", 0), player("local-b", 2), player("local-c", 3)];
    const first = computeProximityGroup(players, "local-a", null);
    const second = computeProximityGroup(players, "local-c", null);
    expect(first?.roomId).toBe(second?.roomId);
    expect(first?.memberIds).toEqual(["local-a", "local-b", "local-c"]);
  });

  it("uses hysteresis to avoid rapid group switching at the boundary", () => {
    const close = [player("local-a", 0), player("local-b", 3)];
    const active = computeProximityGroup(close, "local-a", null);
    expect(computeProximityGroup([player("local-a", 0), player("local-b", 4)], "local-a", active)?.memberIds).toContain("local-b");
    expect(computeProximityGroup([player("local-a", 0), player("local-b", 4.8)], "local-a", active)).toBeNull();
  });
});
