import { z } from "zod";

export type ProjectStatus = "planned" | "active" | "paused" | "completed" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskDbStatus = "todo" | "in_progress" | "in_review" | "done";

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: TaskPriority;
  ownerId?: string | null;
  ownerName?: string | null;
  dueAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskItem = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  projectName?: string | null;
  title: string;
  description: string;
  status: TaskDbStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueAt?: string | null;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export const CreateProjectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().min(1, "Project name is required").max(140),
  description: z.string().max(2000).default(""),
  status: z.enum(["planned", "active", "paused", "completed", "archived"]).default("active"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueAt: z.string().nullable().optional(),
});

export const UpdateProjectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().min(1).max(140).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["planned", "active", "paused", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueAt: z.string().nullable().optional(),
});

export const CreateTaskSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().nullable().optional(),
  title: z.string().min(1, "Task title is required").max(240),
  description: z.string().max(5000).default(""),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigneeId: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
});

export const UpdateTaskSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  taskId: z.string().min(1, "Task ID is required"),
  title: z.string().min(1).max(240).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  position: z.number().optional(),
});

export const CreateCommentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  taskId: z.string().min(1, "Task ID is required"),
  body: z.string().min(1, "Comment text is required").max(10000),
});
