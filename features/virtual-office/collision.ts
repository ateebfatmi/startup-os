import type { Collider, Vec2 } from "./types";

// Interior 2D blueprint bounds (used for architectural blueprint SVG mapping)
export const BLUEPRINT_BOUNDS = { minX: -11.5, maxX: 11.5, minZ: -8.5, maxZ: 8.5 };
// Total walkable world boundary including the 30m x 5m Penthouse Sky Terrace
export const OFFICE_BOUNDS = { minX: -14.5, maxX: 14.5, minZ: -8.5, maxZ: 14.0 };
export const PLAYER_RADIUS = 0.28;

export const COLLIDERS: Collider[] = [
  // North row room dividers (z = -3.0) with generous door openings for effortless corridor transit
  { id: "wall-north-conf-w", x: -9.5, z: -3.0, width: 5.0, depth: 0.18 },
  { id: "wall-north-founder-w", x: -3.1, z: -3.0, width: 0.9, depth: 0.18 },
  { id: "wall-north-mgr-w", x: 1.1, z: -3.0, width: 0.9, depth: 0.18 },
  { id: "wall-north-pantry-w", x: 4.8, z: -3.0, width: 0.6, depth: 0.18 },
  { id: "wall-north-wash-w", x: 10.4, z: -3.0, width: 3.2, depth: 0.18 },

  // Vertical dividing walls in North row
  { id: "wall-conf-founder", x: -3.5, z: -6.0, width: 0.18, depth: 6.0 },
  { id: "wall-founder-mgr", x: 0.5, z: -6.0, width: 0.18, depth: 6.0 },
  { id: "wall-mgr-pantry", x: 4.5, z: -6.0, width: 0.18, depth: 6.0 },
  { id: "wall-pantry-wash", x: 8.5, z: -6.0, width: 0.18, depth: 6.0 },
  { id: "wall-wash-divider", x: 10.2, z: -5.8, width: 3.6, depth: 0.18 },

  // Product / Project Room (Middle Right) - widened entry opening
  { id: "wall-project-north", x: 8.2, z: -2.5, width: 7.6, depth: 0.18 },
  { id: "wall-project-south", x: 8.2, z: 3.0, width: 7.6, depth: 0.18 },
  { id: "wall-project-west-top", x: 4.5, z: -1.75, width: 0.18, depth: 1.3 },
  { id: "wall-project-west-bot", x: 4.5, z: 2.15, width: 0.18, depth: 1.5 },

  // Collaboration Area Divider (Middle Left) - split/trimmed to leave wide open central passage between Workstations and Collaboration
  // Central portal between z = -1.2 and z = 1.2 is completely open
  { id: "divider-collab-n", x: -4.5, z: -2.0, width: 0.12, depth: 1.6 },
  { id: "divider-collab-s", x: -4.5, z: 2.0, width: 0.12, depth: 1.6 },

  // South row dividers
  // Exterior south wall flanking center doorway portal (spacious opening between x: -2.6 and 2.6)
  { id: "wall-south-exterior-left", x: -7.3, z: 9.0, width: 9.4, depth: 0.25 },
  { id: "wall-south-exterior-right", x: 7.3, z: 9.0, width: 9.4, depth: 0.25 },

  // Sky Terrace Balustrade Perimeter Railings (z: 9.5 to 14.2)
  { id: "terrace-south-balustrade", x: 0, z: 14.35, width: 30.0, depth: 0.2 },
  { id: "terrace-west-balustrade", x: -14.9, z: 11.7, width: 0.2, depth: 5.2 },
  { id: "terrace-east-balustrade", x: 14.9, z: 11.7, width: 0.2, depth: 5.2 },
  // Main Office Exterior West and East Walls from z = 0 to 9.0
  { id: "wall-office-west-flank", x: -12.0, z: 4.5, width: 0.25, depth: 9.0 },
  { id: "wall-office-east-flank", x: 12.0, z: 4.5, width: 0.25, depth: 9.0 },

  // Server room - wider doorway opening
  { id: "wall-server-north", x: -9.5, z: 3.0, width: 5.0, depth: 0.18 },
  { id: "wall-server-east", x: -6.5, z: 6.8, width: 0.18, depth: 4.2 },
  // Storage room - wider doorway opening
  { id: "wall-storage-east", x: -3.5, z: 6.8, width: 0.18, depth: 4.2 },
  // Waiting area glass partition - streamlined depth
  { id: "divider-waiting", x: 4.5, z: 6.5, width: 0.12, depth: 3.6 },

  // Key Furniture Colliders (Calibrated footprints to maximize clear walking clearance)
  { id: "meeting-table", x: -7.5, z: -6.0, width: 3.8, depth: 1.8 },
  { id: "founder-desk", x: -1.5, z: -6.8, width: 2.0, depth: 0.9 },
  { id: "manager-desk", x: 2.5, z: -6.8, width: 2.0, depth: 0.9 },
  { id: "pantry-counter", x: 6.5, z: -8.6, width: 3.4, depth: 0.7 },
  { id: "pantry-table", x: 6.5, z: -5.5, width: 1.3, depth: 1.3 },
  // Workstation cluster - streamlined to expand north, south, and side corridors
  { id: "focus-desk-a", x: 0, z: -0.85, width: 6.6, depth: 0.8 },
  { id: "focus-desk-b", x: 0, z: 0.85, width: 6.6, depth: 0.8 },
  { id: "project-table", x: 8.2, z: 0.2, width: 3.4, depth: 1.5 },
  { id: "collab-table", x: -8.5, z: 0, width: 1.5, depth: 1.5 },
  { id: "server-racks", x: -11.4, z: 6.0, width: 0.7, depth: 4.4 },
  { id: "storage-cabinets", x: -5.9, z: 6.0, width: 0.7, depth: 4.2 },
  { id: "reception", x: 0, z: 6.5, width: 2.8, depth: 0.75 },
  { id: "lounge-sofa", x: 8.2, z: 4.5, width: 2.8, depth: 0.9 },

  // Terrace Furniture Obstacles (Positioned with broad walkways)
  { id: "terrace-loungers", x: -4.8, z: 12.15, width: 5.2, depth: 1.5 },
  { id: "terrace-bistro-table", x: 5.4, z: 12.15, width: 1.5, depth: 1.5 },
  { id: "terrace-telescope", x: 9.2, z: 13.35, width: 0.8, depth: 0.8 },
];

function collides(point: Vec2, collider: Collider) {
  return (
    point.x + PLAYER_RADIUS > collider.x - collider.width / 2 &&
    point.x - PLAYER_RADIUS < collider.x + collider.width / 2 &&
    point.z + PLAYER_RADIUS > collider.z - collider.depth / 2 &&
    point.z - PLAYER_RADIUS < collider.z + collider.depth / 2
  );
}

export function resolveMovement(current: Vec2, target: Vec2, colliders = COLLIDERS, isGhost = false): Vec2 {
  const bounded = {
    x: Math.max(OFFICE_BOUNDS.minX, Math.min(OFFICE_BOUNDS.maxX, target.x)),
    z: Math.max(OFFICE_BOUNDS.minZ, Math.min(OFFICE_BOUNDS.maxZ, target.z)),
  };
  if (isGhost) {
    return bounded;
  }
  const tryX = { x: bounded.x, z: current.z };
  const tryZ = { x: current.x, z: bounded.z };
  const x = colliders.some((item) => collides(tryX, item)) ? current.x : tryX.x;
  const zCandidate = { x, z: tryZ.z };
  const z = colliders.some((item) => collides(zCandidate, item)) ? current.z : tryZ.z;
  return { x, z };
}
