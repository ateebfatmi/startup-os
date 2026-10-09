import type { InteractionZone } from "./types";

export const INTERACTION_ZONES: InteractionZone[] = [
  { id: "projects", kind: "projects", label: "Project table", hint: "Open sprint board", x: -3.35, z: 3.4, radius: 1.2 },
  { id: "meeting", kind: "meeting", label: "Meeting room", hint: "Open meeting controls", x: -3.6, z: -3.7, radius: 1.1 },
  { id: "whiteboard", kind: "whiteboard", label: "Whiteboard", hint: "Start sketching", x: 0.4, z: -6.35, radius: 1.3 },
  { id: "focus", kind: "focus", label: "Focus pod", hint: "Start a focus session", x: 3.55, z: -3.4, radius: 1.2 },
];
