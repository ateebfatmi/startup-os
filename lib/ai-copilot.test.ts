import { describe, expect, it } from "vitest";
import { CopilotRequestSchema, generateLocalCopilotResult } from "./ai-copilot";

const tasks = [
  { id: "1", title: "Fix onboarding", status: "In progress", priority: "High" as const, project: "Product", due: "Friday" },
  { id: "2", title: "Publish launch notes", status: "Done", priority: "Low" as const, project: "Launch", due: "Today" },
];

describe("professional Copilot fallback", () => {
  it("validates and bounds workspace context", () => {
    const parsed = CopilotRequestSchema.parse({ mode: "chat", prompt: "Improve activation", workspaceName: "Northstar", tasks });
    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.workspaceName).toBe("Northstar");
  });

  it("creates an implementation-ready PRD and reviewed task suggestions", () => {
    const request = CopilotRequestSchema.parse({ mode: "prd", prompt: "Guided workspace onboarding", workspaceName: "Northstar", tasks });
    const result = generateLocalCopilotResult(request);
    expect(result.result).toContain("## 5. Non-goals");
    expect(result.result).toContain("## 8. Acceptance criteria");
    expect(result.result).toContain("## 9. Measurement plan");
    expect(result.tasksToCreate.length).toBeGreaterThan(0);
    expect(result.tasksToCreate.every((task) => task.rationale.length > 20)).toBe(true);
    expect(result.evidence).toContainEqual({ label: "Task context", value: "2 total · 1 open · 1 done" });
  });

  it("uses placeholders instead of fabricating investor metrics", () => {
    const request = CopilotRequestSchema.parse({ mode: "pitch", prompt: "Northstar", workspaceName: "Northstar", tasks });
    const result = generateLocalCopilotResult(request);
    expect(result.result).toContain("[active teams]");
    expect(result.result).toContain("[Insert sourced figures and methodology.]");
    expect(result.result).not.toMatch(/1,200\+|\$28B|\$1\.5M/);
  });

  it("grounds sprint health in supplied task records", () => {
    const request = CopilotRequestSchema.parse({ mode: "tasks_summary", workspaceName: "Northstar", tasks });
    const result = generateLocalCopilotResult(request);
    expect(result.summary).toContain("1 open task");
    expect(result.result).toContain("Fix onboarding");
    expect(result.confidence).toBe("high");
    expect(result.tasksToCreate).toEqual([]);
  });
});
