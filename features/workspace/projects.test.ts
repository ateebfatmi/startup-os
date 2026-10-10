import { describe, expect, it, beforeEach } from "vitest";
import {
  CreateCommentSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  UpdateProjectSchema,
  UpdateTaskSchema,
} from "./project-types";
import {
  createProject,
  createTask,
  createTaskComment,
  deleteProject,
  deleteTask,
  deleteTaskComment,
  fetchTaskComments,
  fetchWorkspaceProjects,
  fetchWorkspaceTasks,
  getStoredLocalComments,
  getStoredLocalProjects,
  getStoredLocalTasks,
  INITIAL_DEMO_COMMENTS,
  INITIAL_DEMO_PROJECTS,
  INITIAL_DEMO_TASKS,
  saveStoredLocalComments,
  saveStoredLocalProjects,
  saveStoredLocalTasks,
  updateProject,
  updateTask,
} from "./project-service";

describe("Workspace Project & Task CRUD, Comments, and Filtering", () => {
  beforeEach(() => {
    saveStoredLocalProjects([...INITIAL_DEMO_PROJECTS]);
    saveStoredLocalTasks([...INITIAL_DEMO_TASKS]);
    saveStoredLocalComments([...INITIAL_DEMO_COMMENTS]);
  });

  describe("Zod Validation Schemas", () => {
    it("validates project creation and update inputs", () => {
      expect(() =>
        CreateProjectSchema.parse({
          workspaceId: "",
          name: "",
        }),
      ).toThrow();

      const valid = CreateProjectSchema.parse({
        workspaceId: "ws-1",
        name: "Mobile App Beta",
        description: "Native mobile experience",
        status: "active",
        priority: "high",
      });
      expect(valid.name).toBe("Mobile App Beta");
      expect(valid.priority).toBe("high");

      const updateValid = UpdateProjectSchema.parse({
        workspaceId: "ws-1",
        projectId: "proj-1",
        status: "completed",
      });
      expect(updateValid.status).toBe("completed");
    });

    it("validates task creation, updates, and comment inputs", () => {
      expect(() =>
        CreateTaskSchema.parse({
          workspaceId: "ws-1",
          title: "",
        }),
      ).toThrow();

      const validTask = CreateTaskSchema.parse({
        workspaceId: "ws-1",
        title: "Implement WebRTC ICE Candidate Buffer",
        status: "in_progress",
        priority: "urgent",
        dueAt: "2026-10-20T00:00:00.000Z",
      });
      expect(validTask.priority).toBe("urgent");

      const validComment = CreateCommentSchema.parse({
        workspaceId: "ws-1",
        taskId: "task-1",
        body: "LGTM!",
      });
      expect(validComment.body).toBe("LGTM!");
    });
  });

  describe("Projects Service CRUD", () => {
    it("creates, fetches, updates, and deletes projects", async () => {
      const created = await createProject({
        workspaceId: "northstar-demo",
        name: "Security Audit",
        description: "Penetration testing and access control review",
        status: "planned",
        priority: "urgent",
      });

      expect(created.name).toBe("Security Audit");
      expect(created.priority).toBe("urgent");

      const projects = await fetchWorkspaceProjects("northstar-demo");
      expect(projects.some((p) => p.id === created.id)).toBe(true);

      await updateProject({
        workspaceId: "northstar-demo",
        projectId: created.id,
        status: "active",
      });

      const updatedProjects = await fetchWorkspaceProjects("northstar-demo");
      const updated = updatedProjects.find((p) => p.id === created.id);
      expect(updated?.status).toBe("active");

      await deleteProject("northstar-demo", created.id);
      const finalProjects = await fetchWorkspaceProjects("northstar-demo");
      expect(finalProjects.some((p) => p.id === created.id)).toBe(false);
    });
  });

  describe("Tasks Service CRUD & Filtering", () => {
    it("creates, fetches, updates, and deletes tasks with project & assignee assignments", async () => {
      const created = await createTask({
        workspaceId: "northstar-demo",
        projectId: "proj-1",
        title: "Add proximity audio grouping",
        description: "WebRTC spatial sound radius calculation",
        status: "todo",
        priority: "high",
        assigneeId: "demo-user-2",
        dueAt: "2026-10-30T00:00:00.000Z",
      });

      expect(created.title).toBe("Add proximity audio grouping");
      expect(created.projectId).toBe("proj-1");

      // Fetch with project filter
      const project1Tasks = await fetchWorkspaceTasks("northstar-demo", { projectId: "proj-1" });
      expect(project1Tasks.some((t) => t.id === created.id)).toBe(true);

      // Move task status to in_progress
      await updateTask({
        workspaceId: "northstar-demo",
        taskId: created.id,
        status: "in_progress",
      });

      const inProgressTasks = await fetchWorkspaceTasks("northstar-demo", { status: "in_progress" });
      expect(inProgressTasks.some((t) => t.id === created.id)).toBe(true);

      await deleteTask("northstar-demo", created.id);
      const remainingTasks = await fetchWorkspaceTasks("northstar-demo");
      expect(remainingTasks.some((t) => t.id === created.id)).toBe(false);
    });
  });

  describe("Task Comments Service", () => {
    it("creates, fetches, and deletes comments on tasks", async () => {
      const comment = await createTaskComment({
        workspaceId: "northstar-demo",
        taskId: "task-1",
        body: "All test cases passing cleanly!",
      });

      expect(comment.body).toBe("All test cases passing cleanly!");

      const comments = await fetchTaskComments("northstar-demo", "task-1");
      expect(comments.some((c) => c.id === comment.id)).toBe(true);

      await deleteTaskComment("northstar-demo", comment.id);
      const remainingComments = await fetchTaskComments("northstar-demo", "task-1");
      expect(remainingComments.some((c) => c.id === comment.id)).toBe(false);
    });
  });
});
