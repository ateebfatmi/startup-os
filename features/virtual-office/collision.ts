import type { Collider, Vec2 } from "./types";

export const OFFICE_BOUNDS = { minX: -10.9, maxX: 10.9, minZ: -7.1, maxZ: 7.1 };
export const PLAYER_RADIUS = 0.38;

export const COLLIDERS: Collider[] = [
  { id: "meeting-table", x: -6.2, z: -3.7, width: 4.2, depth: 2.3 },
  { id: "focus-desk-a", x: 5.9, z: -4.7, width: 3.5, depth: 1.4 },
  { id: "focus-desk-b", x: 5.9, z: -2.2, width: 3.5, depth: 1.4 },
  { id: "project-table", x: -5.8, z: 3.4, width: 4.3, depth: 2.2 },
  { id: "lounge-sofa", x: 5.8, z: 3.7, width: 3.7, depth: 1.2 },
  { id: "divider", x: 0, z: -5.4, width: 0.35, depth: 3.1 },
];

function collides(point: Vec2, collider: Collider) {
  return (
    point.x + PLAYER_RADIUS > collider.x - collider.width / 2 &&
    point.x - PLAYER_RADIUS < collider.x + collider.width / 2 &&
    point.z + PLAYER_RADIUS > collider.z - collider.depth / 2 &&
    point.z - PLAYER_RADIUS < collider.z + collider.depth / 2
  );
}

export function resolveMovement(current: Vec2, target: Vec2, colliders = COLLIDERS): Vec2 {
  const bounded = {
    x: Math.max(OFFICE_BOUNDS.minX, Math.min(OFFICE_BOUNDS.maxX, target.x)),
    z: Math.max(OFFICE_BOUNDS.minZ, Math.min(OFFICE_BOUNDS.maxZ, target.z)),
  };
  const tryX = { x: bounded.x, z: current.z };
  const tryZ = { x: current.x, z: bounded.z };
  const x = colliders.some((item) => collides(tryX, item)) ? current.x : tryX.x;
  const zCandidate = { x, z: tryZ.z };
  const z = colliders.some((item) => collides(zCandidate, item)) ? current.z : tryZ.z;
  return { x, z };
}
