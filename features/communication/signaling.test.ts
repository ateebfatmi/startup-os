import { describe, expect, it } from "vitest";
import { isSignalMessage } from "./signaling";

describe("call signaling protocol", () => {
  it("accepts a directed WebRTC offer", () => {
    expect(isSignalMessage({ roomId: "weekly", sourceId: "player-a", sourceName: "A", targetId: "player-b", type: "offer", payload: { type: "offer", sdp: "v=0" } })).toBe(true);
  });

  it("rejects unknown signaling event types", () => {
    expect(isSignalMessage({ roomId: "weekly", sourceId: "player-a", sourceName: "A", type: "delete-workspace" })).toBe(false);
  });
});
