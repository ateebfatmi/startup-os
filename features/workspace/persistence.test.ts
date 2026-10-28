import { describe, expect, it } from "vitest";
import { describeActivity, type ActivityEvent } from "./activity-service";
import { MAX_WORKSPACE_FILE_BYTES, validateWorkspaceFile } from "./document-service";

describe("workspace persistence", () => {
  it("formats audited activity into human language", () => {
    const event: ActivityEvent = {
      id: "1",
      workspaceId: "workspace-1",
      actorId: "user-1",
      actorName: "Ateeb",
      verb: "insert",
      objectType: "projects",
      objectId: "project-1",
      name: "Launch",
      createdAt: new Date().toISOString(),
    };
    expect(describeActivity(event)).toBe("created project “Launch”");
  });

  it("accepts supported files within the private upload limit", () => {
    expect(() => validateWorkspaceFile({ name: "brief.pdf", type: "application/pdf", size: 1024 })).not.toThrow();
  });

  it("rejects oversized and executable uploads", () => {
    expect(() => validateWorkspaceFile({ name: "huge.pdf", type: "application/pdf", size: MAX_WORKSPACE_FILE_BYTES + 1 })).toThrow("25 MB");
    expect(() => validateWorkspaceFile({ name: "script.exe", type: "application/x-msdownload", size: 1024 })).toThrow("Unsupported");
  });
});
