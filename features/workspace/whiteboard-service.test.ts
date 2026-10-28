import { describe, expect, it } from "vitest";
import { mergeWhiteboardElement, parseWhiteboardDocument, type WhiteboardElement } from "./whiteboard-service";

const note = (clock: number, clientId: string, text: string): WhiteboardElement => ({ id: "note-1", type: "note", x: 10, y: 20, width: 180, height: 120, text, color: "#fff", clock, clientId, deleted: false });

describe("whiteboard operation merge", () => {
  it("keeps the newest logical-clock version regardless of arrival order", () => {
    const newest = note(3, "client-b", "latest");
    expect(mergeWhiteboardElement([newest], note(2, "client-a", "stale"))[0]).toEqual(newest);
    expect(mergeWhiteboardElement([note(2, "client-a", "stale")], newest)[0]).toEqual(newest);
  });

  it("uses the client id as a deterministic concurrent-edit tie breaker", () => {
    const merged = mergeWhiteboardElement([note(4, "client-a", "first")], note(4, "client-b", "second"))[0];
    expect(merged.type === "note" ? merged.text : "").toBe("second");
  });

  it("rejects malformed persisted documents", () => {
    expect(parseWhiteboardDocument({ version: 2, elements: [{ type: "script" }] })).toEqual({ version: 2, elements: [] });
  });
});
