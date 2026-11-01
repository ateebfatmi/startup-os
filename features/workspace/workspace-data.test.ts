import { beforeEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createProject, createTask, deleteProject, deleteTask, fetchTaskComments, fetchWorkspaceProjects, fetchWorkspaceTasks, saveStoredLocalProjects, saveStoredLocalTasks, updateProject, updateTask } from "./project-service";
import { persistSuggestedTask, presentTask } from "./workspace-task-adapter";
import { mergeLegacyDemoTasks } from "./legacy-task-migration";
import { workspaceRecordsKey, workspaceRecordsOptions } from "./workspace-data-provider";
import { fetchWorkspaceActivity } from "./activity-service";
import { fetchWorkspaceInvitations, fetchWorkspaceMembers } from "./member-service";
import { subscribeWorkspaceRecords } from "./workspace-record-events";

beforeEach(() => { saveStoredLocalProjects([]); saveStoredLocalTasks([]); });

describe("unified workspace records", () => {
  it("persists reviewed Copilot tasks in the same repository used by Kanban and overview", async () => {
    const project = await createProject({ workspaceId: "alpha", name: "Launch" });
    const task = await persistSuggestedTask("alpha", [project], { title: "Ship onboarding", priority: "High", project: "Launch", due: "2026-11-10", rationale: "Improve activation" });
    const client = new QueryClient();
    const snapshot = await client.fetchQuery(workspaceRecordsOptions("alpha"));
    expect(snapshot.tasks).toEqual([expect.objectContaining({ id: task.id, projectId: project.id, priority: "high", dueAt: "2026-11-10T00:00:00.000Z", description: "Improve activation" })]);
    expect(presentTask(snapshot.tasks[0])).toMatchObject({ title: "Ship onboarding", status: "Todo", project: "Launch" });
    client.clear();
  });

  it("never reads another workspace, including through the former demo wildcard", async () => {
    await createTask({ workspaceId: "alpha", title: "Alpha only" });
    await createProject({ workspaceId: "alpha", name: "Secret project" });
    expect(await fetchWorkspaceTasks("beta")).toEqual([]);
    expect(await fetchWorkspaceTasks("northstar-demo")).toEqual([]);
    expect(await fetchWorkspaceProjects("northstar-demo")).toEqual([]);
  });

  it("scopes updates, deletes and project assignments to the supplied workspace", async () => {
    const project = await createProject({ workspaceId: "alpha", name: "Alpha" });
    const task = await createTask({ workspaceId: "alpha", title: "Keep me" });
    await updateTask({ workspaceId: "beta", taskId: task.id, title: "Wrong workspace" });
    await deleteTask("beta", task.id);
    await updateProject({ workspaceId: "beta", projectId: project.id, name: "Wrong project" });
    await deleteProject("beta", project.id);
    expect((await fetchWorkspaceTasks("alpha"))[0].title).toBe("Keep me");
    expect((await fetchWorkspaceProjects("alpha"))[0].name).toBe("Alpha");
    await expect(createTask({ workspaceId: "beta", projectId: project.id, title: "Crossed project" })).rejects.toThrow("Project does not belong");
    expect(await fetchTaskComments("beta", task.id)).toEqual([]);
  });

  it("does not expose another workspace's sample members, invitations or activity", async () => {
    expect(await fetchWorkspaceMembers("alpha")).toEqual([]);
    expect(await fetchWorkspaceInvitations("alpha")).toEqual([]);
    expect(await fetchWorkspaceActivity("alpha")).toEqual([]);
  });

  it("retains relative AI timing as context and never assigns a project from another workspace", async () => {
    const project = await createProject({ workspaceId: "alpha", name: "Launch" });
    const task = await persistSuggestedTask("beta", [project], { title: "Plan research", project: "Launch", due: "Next week" });
    expect(task.projectId).toBeNull();
    expect(task.dueAt).toBeNull();
    expect(task.description).toContain("Suggested timing: Next week");
  });

  it("reloads persisted tasks into a fresh client without carrying the previous workspace cache", async () => {
    await createTask({ workspaceId: "alpha", title: "Persistent" });
    const first = new QueryClient();
    await first.fetchQuery(workspaceRecordsOptions("alpha"));
    first.clear();
    const second = new QueryClient();
    expect((await second.fetchQuery(workspaceRecordsOptions("alpha"))).tasks[0].title).toBe("Persistent");
    expect((await second.fetchQuery(workspaceRecordsOptions("beta"))).tasks).toEqual([]);
    expect(workspaceRecordsKey("alpha")).not.toEqual(workspaceRecordsKey("beta"));
    second.clear();
  });

  it("keeps a delayed previous workspace response in its own query key", async () => {
    const client = new QueryClient();
    let finish!: (value: { tasks: never[]; projects: never[] }) => void;
    const previous = client.fetchQuery({ ...workspaceRecordsOptions("alpha"), queryFn: () => new Promise<{ tasks: never[]; projects: never[] }>((resolve) => { finish = resolve; }) });
    await createTask({ workspaceId: "beta", title: "Current workspace" });
    await client.fetchQuery(workspaceRecordsOptions("beta"));
    finish({ tasks: [], projects: [] });
    await previous;
    expect(client.getQueryData(workspaceRecordsKey("beta"))).toMatchObject({ tasks: [expect.objectContaining({ title: "Current workspace" })] });
    client.clear();
  });

  it("announces mutations with their workspace so only the matching cache is invalidated", async () => {
    const changed: string[] = [];
    const stop = subscribeWorkspaceRecords((workspaceId) => changed.push(workspaceId));
    const task = await createTask({ workspaceId: "alpha", title: "Notify" });
    await updateTask({ workspaceId: "alpha", taskId: task.id, status: "done" });
    stop();
    expect(changed).toEqual(["alpha", "alpha"]);
  });

  it("migrates legacy tasks only into the original demo, without overwriting canonical records", async () => {
    const current = await createTask({ workspaceId: "alpha", title: "Canonical" });
    const rows = [
      { id: "legacy", title: "Older Copilot task", status: "Todo", priority: "Medium", project: "Product", due: "Soon" },
      { id: current.id, title: "Overwrite attempt", status: "Done", priority: "Low", project: "", due: "" },
      { invalid: true },
    ];
    const merged = mergeLegacyDemoTasks([current], rows, "northstar-demo");
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(current);
    expect(merged[1]).toMatchObject({ workspaceId: "northstar-demo", title: "Older Copilot task" });
    expect(mergeLegacyDemoTasks(merged, rows, "northstar-demo")).toEqual(merged);
  });
});
