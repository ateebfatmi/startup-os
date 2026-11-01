"use client";

import { useWorkspaceRecords } from "./workspace-data-provider";
import { persistSuggestedTask, presentTask, taskStatuses } from "./workspace-task-adapter";
import { updateTask } from "./project-service";
import type { Task, TaskStatus } from "./sample-data";
import type { TaskDbStatus } from "./project-types";

export function useWorkspaceData() {
  const records = useWorkspaceRecords();
  return {
    tasks: records.tasks.map(presentTask),
    loading: records.loading,
    error: records.error,
    moveTask: async (id: string, status: TaskStatus) => {
      const dbStatus = (Object.keys(taskStatuses) as TaskDbStatus[]).find((key) => taskStatuses[key] === status)!;
      await updateTask({ workspaceId: records.workspaceId, taskId: id, status: dbStatus });
      await records.reload();
    },
    addTask: async (input: string | (Partial<Task> & { title: string; rationale?: string })) => {
      await persistSuggestedTask(records.workspaceId, records.projects, typeof input === "string" ? { title: input } : input);
      await records.reload();
    },
  };
}
