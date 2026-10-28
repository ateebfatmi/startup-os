import type { InteractionZone, OfficeRoom } from "./types";

export const INTERACTION_ZONES: InteractionZone[] = [
  { id: "projects", kind: "projects", label: "Strategy table", hint: "Open the launch board", x: -3.35, z: 3.4, radius: 1.2 },
  { id: "meeting", kind: "meeting", label: "Executive boardroom", hint: "Open meeting controls", x: -3.6, z: -3.7, radius: 1.1 },
  { id: "whiteboard", kind: "whiteboard", label: "Canvas wall", hint: "Start sketching", x: 0.4, z: -6.35, radius: 1.3 },
  { id: "focus", kind: "focus", label: "Focus library", hint: "Start a focus session", x: 3.55, z: -3.4, radius: 1.2 },
  { id: "ai_assistant", kind: "ai_assistant", label: "AI Startup Pod", hint: "Interact with AI Assistant", x: 8.5, z: -3.4, radius: 1.3 },
];

export const OFFICE_ROOMS: OfficeRoom[] = [
  { id: "boardroom", name: "Executive Boardroom", shortName: "Boardroom", description: "Private decisions and client calls", color: "#456657", bounds: { minX: -11.2, maxX: -2.7, minZ: -7.1, maxZ: 0 }, destination: { x: -3.35, z: -2.15 }, labelPosition: { x: -8.55, z: -6.55 } },
  { id: "team-studio", name: "Team Studio", shortName: "Team studio", description: "Shared desks and quick collaboration", color: "#385765", bounds: { minX: 2.7, maxX: 11.2, minZ: -7.1, maxZ: 0 }, destination: { x: 3.35, z: -1.25 }, labelPosition: { x: 5.15, z: -6.55 } },
  { id: "strategy", name: "Strategy Studio", shortName: "Strategy", description: "Planning, reviews, and project rituals", color: "#37624a", bounds: { minX: -11.2, maxX: -2.7, minZ: 0, maxZ: 7.75 }, destination: { x: -3.35, z: 2.0 }, labelPosition: { x: -8.7, z: 0.55 } },
  { id: "social", name: "Social Lounge", shortName: "Lounge", description: "Coffee, casual chats, and team resets", color: "#7b4d39", bounds: { minX: 2.7, maxX: 11.2, minZ: 0, maxZ: 7.75 }, destination: { x: 3.4, z: 5.4 }, labelPosition: { x: 5.05, z: 0.55 } },
  { id: "atrium", name: "Collaboration Atrium", shortName: "Atrium", description: "Whiteboard, reception, and shared tools", color: "#b39258", bounds: { minX: -2.7, maxX: 2.7, minZ: -7.1, maxZ: 7.75 }, destination: { x: 0, z: 2.3 }, labelPosition: { x: 0, z: -6.7 } },
  { id: "terrace", name: "Sky Terrace", shortName: "Terrace", description: "Outdoor conversations and quiet breaks", color: "#8a6549", bounds: { minX: -11.2, maxX: 11.2, minZ: 7.75, maxZ: 11.6 }, destination: { x: 0, z: 9.25 }, labelPosition: { x: 0, z: 8.35 } },
];

export function getOfficeRoomAt(x: number, z: number) {
  return OFFICE_ROOMS.find((room) => x >= room.bounds.minX && x <= room.bounds.maxX && z >= room.bounds.minZ && z <= room.bounds.maxZ) ?? null;
}
