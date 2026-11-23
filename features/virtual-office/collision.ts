import type { Collider, Vec2 } from "./types";

// Interior 2D blueprint bounds (used for architectural blueprint SVG mapping)
export const BLUEPRINT_BOUNDS = { minX: -11.5, maxX: 11.5, minZ: -8.5, maxZ: 8.5 };
// Total walkable world boundary including the 30m x 5m Penthouse Sky Terrace
export const OFFICE_BOUNDS = { minX: -14.5, maxX: 14.5, minZ: -8.5, maxZ: 14.0 };
export const PLAYER_RADIUS = 0.38;

export const COLLIDERS: Collider[] = [
  // North row room dividers (z = -3.0) with door openings
  { id: "wall-north-conf-w", x: -9.0, z: -3.0, width: 6.0, depth: 0.2 },
  { id: "wall-north-founder-w", x: -3.0, z: -3.0, width: 1.2, depth: 0.2 },
  { id: "wall-north-mgr-w", x: 1.0, z: -3.0, width: 1.2, depth: 0.2 },
  { id: "wall-north-pantry-w", x: 4.8, z: -3.0, width: 0.8, depth: 0.2 },
  { id: "wall-north-wash-w", x: 10.2, z: -3.0, width: 3.6, depth: 0.2 },

  // Vertical dividing walls in North row
  { id: "wall-conf-founder", x: -3.5, z: -6.0, width: 0.2, depth: 6.0 },
  { id: "wall-founder-mgr", x: 0.5, z: -6.0, width: 0.2, depth: 6.0 },
  { id: "wall-mgr-pantry", x: 4.5, z: -6.0, width: 0.2, depth: 6.0 },
  { id: "wall-pantry-wash", x: 8.5, z: -6.0, width: 0.2, depth: 6.0 },
  { id: "wall-wash-divider", x: 10.2, z: -5.8, width: 3.6, depth: 0.2 },

  // Product / Project Room (Middle Right)
  { id: "wall-project-north", x: 8.2, z: -2.5, width: 7.6, depth: 0.2 },
  { id: "wall-project-south", x: 8.2, z: 3.0, width: 7.6, depth: 0.2 },
  { id: "wall-project-west-top", x: 4.5, z: -1.6, width: 0.2, depth: 1.6 },
  { id: "wall-project-west-bot", x: 4.5, z: 2.0, width: 0.2, depth: 1.8 },

  // Collaboration Glass Divider (Middle Left)
  { id: "divider-collab", x: -4.5, z: 0, width: 0.15, depth: 3.8 },

  // South row dividers
  // Exterior south wall flanking center doorway portal (opening between x: -2.4 and 2.4)
  { id: "wall-south-exterior-left", x: -7.2, z: 9.0, width: 9.6, depth: 0.3 },
  { id: "wall-south-exterior-right", x: 7.2, z: 9.0, width: 9.6, depth: 0.3 },

  // Sky Terrace Balustrade Perimeter Railings (z: 9.5 to 14.2)
  { id: "terrace-south-balustrade", x: 0, z: 14.35, width: 30.0, depth: 0.2 },
  { id: "terrace-west-balustrade", x: -14.9, z: 11.7, width: 0.2, depth: 5.2 },
  { id: "terrace-east-balustrade", x: 14.9, z: 11.7, width: 0.2, depth: 5.2 },
  // Main Office Exterior West and East Walls from z = 0 to 9.0
  { id: "wall-office-west-flank", x: -12.0, z: 4.5, width: 0.3, depth: 9.0 },
  { id: "wall-office-east-flank", x: 12.0, z: 4.5, width: 0.3, depth: 9.0 },

  // Server room
  { id: "wall-server-north", x: -9.2, z: 3.0, width: 5.6, depth: 0.2 },
  { id: "wall-server-east", x: -6.5, z: 6.8, width: 0.2, depth: 4.2 },
  // Storage room
  { id: "wall-storage-east", x: -3.5, z: 6.8, width: 0.2, depth: 4.2 },
  // Waiting area glass partition
  { id: "divider-waiting", x: 4.5, z: 6.5, width: 0.15, depth: 4.8 },

  // Key Furniture Colliders
  { id: "meeting-table", x: -7.5, z: -6.0, width: 4.2, depth: 2.1 },
  { id: "founder-desk", x: -1.5, z: -6.8, width: 2.2, depth: 1.1 },
  { id: "manager-desk", x: 2.5, z: -6.8, width: 2.2, depth: 1.1 },
  { id: "pantry-counter", x: 6.5, z: -8.6, width: 3.6, depth: 0.8 },
  { id: "pantry-table", x: 6.5, z: -5.5, width: 1.5, depth: 1.5 },
  { id: "focus-desk-a", x: 0.2, z: -0.65, width: 7.2, depth: 0.9 },
  { id: "focus-desk-b", x: 0.2, z: 0.65, width: 7.2, depth: 0.9 },
  { id: "project-table", x: 8.2, z: 0.2, width: 3.8, depth: 1.8 },
  { id: "collab-table", x: -8.5, z: 0, width: 1.8, depth: 1.8 },
  { id: "server-racks", x: -11.2, z: 6.0, width: 0.9, depth: 4.8 },
  { id: "storage-cabinets", x: -5.8, z: 6.0, width: 0.8, depth: 4.5 },
  { id: "reception", x: 0, z: 6.2, width: 3.2, depth: 0.9 },
  { id: "lounge-sofa", x: 8.2, z: 4.5, width: 3.2, depth: 1.1 },

  // Terrace Furniture Obstacles
  { id: "terrace-loungers", x: -4.8, z: 12.15, width: 5.6, depth: 1.8 },
  { id: "terrace-bistro-table", x: 5.4, z: 12.15, width: 1.8, depth: 1.8 },
  { id: "terrace-telescope", x: 9.2, z: 13.35, width: 1.0, depth: 1.0 },
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
