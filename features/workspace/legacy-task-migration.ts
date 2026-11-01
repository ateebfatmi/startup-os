import { z } from "zod";
import type { TaskItem } from "./project-types";

const LegacyTask = z.object({
  id: z.string().min(1), title: z.string().min(1).max(240),
  status: z.enum(["Todo", "In progress", "In review", "Done"]),
  priority: z.enum(["High", "Medium", "Low"]), project: z.string(), due: z.string(),
});

// The old shell store had no workspace identity. Its records belong exclusively
// to the original demo, never to whichever authenticated workspace opens next.
export function mergeLegacyDemoTasks(current: TaskItem[], legacy: unknown, demoWorkspaceId: string): TaskItem[] {
  if (!Array.isArray(legacy)) return current;
  const tasks = [...current];
  const known = new Set(current.map((task) => task.id));
  for (const value of legacy) {
    const parsed = LegacyTask.safeParse(value);
    if (!parsed.success || known.has(parsed.data.id)) continue;
    const task = parsed.data;
    const timestamp = new Date().toISOString();
    tasks.push({
      id: task.id, workspaceId: demoWorkspaceId, title: task.title,
      description: `Imported from the previous local demo. Project: ${task.project}. Timing: ${task.due}.`,
      projectId: null, projectName: task.project,
      status: task.status === "Done" ? "done" : task.status === "In progress" ? "in_progress" : task.status === "In review" ? "in_review" : "todo",
      priority: task.priority === "High" ? "high" : task.priority === "Low" ? "low" : "medium",
      dueAt: null, position: tasks.length, createdBy: "demo-user-1", createdAt: timestamp, updatedAt: timestamp,
    });
    known.add(task.id);
  }
  return tasks;
}
