import type { InteractionZone } from "./types";

export const INTERACTION_ZONES: InteractionZone[] = [
  { id: "projects", kind: "projects", label: "Strategy table", hint: "Open the launch board", x: -3.35, z: 3.4, radius: 1.2 },
  { id: "meeting", kind: "meeting", label: "Executive boardroom", hint: "Open meeting controls", x: -3.6, z: -3.7, radius: 1.1 },
  { id: "whiteboard", kind: "whiteboard", label: "Canvas wall", hint: "Start sketching", x: 0.4, z: -6.35, radius: 1.3 },
  { id: "focus", kind: "focus", label: "Focus library", hint: "Start a focus session", x: 3.55, z: -3.4, radius: 1.2 },
  { id: "ai_assistant", kind: "ai_assistant", label: "AI Startup Pod", hint: "Interact with AI Assistant", x: 8.5, z: -3.4, radius: 1.3 },
];
