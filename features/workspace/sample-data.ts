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
