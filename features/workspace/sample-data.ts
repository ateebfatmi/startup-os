export type TaskStatus = "Todo" | "In progress" | "In review" | "Done";
export type Priority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  project: string;
  due: string;
};

export const INITIAL_TASKS: Task[] = [
  { id: "task-1", title: "Confirm launch narrative", status: "In progress", priority: "High", project: "Launch", due: "Oct 10" },
  { id: "task-2", title: "Review onboarding flow", status: "In review", priority: "Medium", project: "Product", due: "Oct 11" },
  { id: "task-3", title: "Publish customer notes", status: "Todo", priority: "Low", project: "Research", due: "Oct 14" },
  { id: "task-4", title: "Close analytics gaps", status: "Done", priority: "High", project: "Launch", due: "Oct 9" },
];
