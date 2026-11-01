import type { Task, TaskStatus } from "./sample-data";
import type { Project, TaskDbStatus, TaskItem } from "./project-types";
import { createTask } from "./project-service";

export const taskStatuses: Record<TaskDbStatus, TaskStatus> = {
  todo: "Todo", in_progress: "In progress", in_review: "In review", done: "Done",
};

// Presentation adapter only: records always come from the shared repository.
export function presentTask(task: TaskItem): Task {
  return {
    id: task.id, title: task.title, status: taskStatuses[task.status],
    priority: task.priority === "urgent" || task.priority === "high" ? "High" : task.priority === "low" ? "Low" : "Medium",
    project: task.projectName || "Unassigned",
    due: task.dueAt ? task.dueAt.slice(0, 10) : "No date",
  };
}

export async function persistSuggestedTask(workspaceId: string, projects: Project[], input: Partial<Task> & { title: string; rationale?: string }) {
  const project = projects.find((item) => item.workspaceId === workspaceId && item.name.toLowerCase() === input.project?.toLowerCase());
  // Relative AI phrases are retained as context, never guessed into a deadline.
  const due = input.due && /^\d{4}-\d{2}-\d{2}$/.test(input.due) ? new Date(`${input.due}T00:00:00.000Z`) : null;
  const dueAt = due && Number.isFinite(due.getTime()) && due.toISOString().startsWith(input.due!) ? due.toISOString() : null;
  return createTask({
    workspaceId, title: input.title, projectId: project?.id ?? null,
    priority: input.priority === "High" ? "high" : input.priority === "Low" ? "low" : "medium",
    status: "todo", dueAt,
    description: [input.rationale, !project && input.project ? `Suggested project: ${input.project}` : null, input.due && !dueAt ? `Suggested timing: ${input.due}` : null].filter(Boolean).join("\n"),
  });
}
