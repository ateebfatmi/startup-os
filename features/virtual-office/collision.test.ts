import { describe, expect, it } from "vitest";
import { OFFICE_BOUNDS, resolveMovement } from "./collision";

describe("resolveMovement", () => {
  it("keeps a player inside the office", () => {
    expect(resolveMovement({ x: 0, z: 0 }, { x: 99, z: -99 }, [])).toEqual({ x: OFFICE_BOUNDS.maxX, z: OFFICE_BOUNDS.minZ });
  });

  it("blocks movement through furniture", () => {
    const collider = [{ id: "desk", x: 2, z: 0, width: 1, depth: 1 }];
    const result = resolveMovement({ x: 1, z: 0 }, { x: 1.3, z: 0 }, collider);
    expect(result.x).toBe(1);
  });

  it("slides along an obstacle on the unblocked axis", () => {
    const collider = [{ id: "wall", x: 2, z: 0, width: 1, depth: 1 }];
    const result = resolveMovement({ x: 1, z: 0 }, { x: 1.3, z: 0.2 }, collider);
    expect(result.x).toBe(1);
    expect(result.z).toBe(0.2);
  });
});
