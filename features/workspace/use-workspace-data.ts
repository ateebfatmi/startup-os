"use client";

import { useEffect, useState } from "react";
import { INITIAL_TASKS, type Task, type TaskStatus } from "./sample-data";

const KEY = "orbit-demo-tasks";

export function useWorkspaceData() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored) {
      try { setTasks(JSON.parse(stored) as Task[]); } catch { window.localStorage.removeItem(KEY); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(KEY, JSON.stringify(tasks));
  }, [ready, tasks]);

  const moveTask = (id: string, status: TaskStatus) => setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
  const addTask = (title: string) => setTasks((current) => [...current, { id: crypto.randomUUID(), title, status: "Todo", priority: "Medium", project: "Product", due: "No date" }]);

  return { tasks, moveTask, addTask };
}
