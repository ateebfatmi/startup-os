import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import {
  CreateCommentSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  UpdateProjectSchema,
  UpdateTaskSchema,
  type Project,
  type TaskComment,
  type TaskItem,
} from "./project-types";

export const INITIAL_DEMO_PROJECTS: Project[] = [
  {
    id: "proj-1",
    workspaceId: "northstar-demo",
    name: "Launch",
    description: "Milestone 1 product launch and market positioning",
    status: "active",
    priority: "high",
    ownerId: "demo-user-1",
    ownerName: "Ateeb Fatmi",
    dueAt: "2026-10-25T18:00:00.000Z",
    createdBy: "demo-user-1",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "proj-2",
    workspaceId: "northstar-demo",
    name: "Product Core",
    description: "Core workspace architecture, real-time presence, and WebRTC",
    status: "active",
    priority: "medium",
    ownerId: "demo-user-2",
    ownerName: "Sarah Chen",
    dueAt: "2026-11-10T18:00:00.000Z",
    createdBy: "demo-user-2",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-10-05T10:00:00.000Z",
  },
  {
    id: "proj-3",
    workspaceId: "northstar-demo",
    name: "Customer Research",
    description: "User interviews and feedback synthesis for beta teams",
    status: "planned",
    priority: "low",
    ownerId: "demo-user-3",
    ownerName: "Marcus Johnson",
    dueAt: "2026-11-30T18:00:00.000Z",
    createdBy: "demo-user-1",
    createdAt: "2026-09-15T09:00:00.000Z",
    updatedAt: "2026-09-15T09:00:00.000Z",
  },
];

export const INITIAL_DEMO_TASKS: TaskItem[] = [
  {
    id: "task-1",
    workspaceId: "northstar-demo",
    projectId: "proj-1",
    projectName: "Launch",
    title: "Confirm launch narrative",
    description: "Finalize positioning statement, landing page copy, and press kit.",
    status: "in_progress",
    priority: "high",
    assigneeId: "demo-user-1",
    assigneeName: "Ateeb Fatmi",
    dueAt: "2026-10-15T17:00:00.000Z",
    position: 0,
    createdBy: "demo-user-1",
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-08T12:00:00.000Z",
  },
  {
    id: "task-2",
    workspaceId: "northstar-demo",
    projectId: "proj-2",
    projectName: "Product Core",
    title: "Review onboarding flow",
    description: "Audit workspace creation, template selection, and auth callbacks.",
    status: "in_review",
    priority: "medium",
    assigneeId: "demo-user-2",
    assigneeName: "Sarah Chen",
    dueAt: "2026-10-18T17:00:00.000Z",
    position: 1,
    createdBy: "demo-user-1",
    createdAt: "2026-10-02T10:00:00.000Z",
    updatedAt: "2026-10-09T14:00:00.000Z",
  },
  {
    id: "task-3",
    workspaceId: "northstar-demo",
    projectId: "proj-3",
    projectName: "Customer Research",
    title: "Publish customer notes",
    description: "Summarize 5 user interviews and extract feature priorities.",
    status: "todo",
    priority: "low",
    assigneeId: "demo-user-3",
    assigneeName: "Marcus Johnson",
    dueAt: "2026-10-22T17:00:00.000Z",
    position: 2,
    createdBy: "demo-user-3",
    createdAt: "2026-10-05T11:00:00.000Z",
    updatedAt: "2026-10-05T11:00:00.000Z",
  },
  {
    id: "task-4",
    workspaceId: "northstar-demo",
    projectId: "proj-1",
    projectName: "Launch",
    title: "Close analytics gaps",
    description: "Verify event tracking on onboarding, workspace creation, and office interactions.",
    status: "done",
    priority: "urgent",
    assigneeId: "demo-user-1",
    assigneeName: "Ateeb Fatmi",
    dueAt: "2026-10-09T17:00:00.000Z",
    position: 3,
    createdBy: "demo-user-1",
    createdAt: "2026-09-28T09:00:00.000Z",
    updatedAt: "2026-10-09T16:00:00.000Z",
  },
];

export const INITIAL_DEMO_COMMENTS: TaskComment[] = [
  {
    id: "comment-1",
    taskId: "task-1",
    authorId: "demo-user-1",
    authorName: "Ateeb Fatmi",
    body: "Drafting the launch post now. Will align with the landing page design by tomorrow.",
    createdAt: "2026-10-08T14:30:00.000Z",
  },
  {
    id: "comment-2",
    taskId: "task-2",
    authorId: "demo-user-2",
    authorName: "Sarah Chen",
    body: "Onboarding flow looks clean on desktop and mobile. Ready for review!",
    createdAt: "2026-10-09T11:15:00.000Z",
  },
];

const LOCAL_PROJECTS_KEY = "orbit-demo-projects";
const LOCAL_TASKS_KEY = "orbit-demo-tasks-v2";
const LOCAL_COMMENTS_KEY = "orbit-demo-task-comments";

let memoryProjects: Project[] | null = null;
let memoryTasks: TaskItem[] | null = null;
let memoryComments: TaskComment[] | null = null;

export function getStoredLocalProjects(): Project[] {
  if (typeof window === "undefined") {
    if (!memoryProjects) memoryProjects = [...INITIAL_DEMO_PROJECTS];
    return memoryProjects;
  }
  const data = window.localStorage.getItem(LOCAL_PROJECTS_KEY);
  if (!data) return INITIAL_DEMO_PROJECTS;
  try {
    return JSON.parse(data) as Project[];
  } catch {
    return INITIAL_DEMO_PROJECTS;
  }
}

export function saveStoredLocalProjects(projects: Project[]) {
  memoryProjects = projects;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  }
}

export function getStoredLocalTasks(): TaskItem[] {
  if (typeof window === "undefined") {
    if (!memoryTasks) memoryTasks = [...INITIAL_DEMO_TASKS];
    return memoryTasks;
  }
  const data = window.localStorage.getItem(LOCAL_TASKS_KEY);
  if (!data) return INITIAL_DEMO_TASKS;
  try {
    return JSON.parse(data) as TaskItem[];
  } catch {
    return INITIAL_DEMO_TASKS;
  }
}

export function saveStoredLocalTasks(tasks: TaskItem[]) {
  memoryTasks = tasks;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  }
}

export function getStoredLocalComments(): TaskComment[] {
  if (typeof window === "undefined") {
    if (!memoryComments) memoryComments = [...INITIAL_DEMO_COMMENTS];
    return memoryComments;
  }
  const data = window.localStorage.getItem(LOCAL_COMMENTS_KEY);
  if (!data) return INITIAL_DEMO_COMMENTS;
  try {
    return JSON.parse(data) as TaskComment[];
  } catch {
    return INITIAL_DEMO_COMMENTS;
  }
}

export function saveStoredLocalComments(comments: TaskComment[]) {
  memoryComments = comments;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
  }
}

/* Projects Service API */

export async function fetchWorkspaceProjects(workspaceId: string): Promise<Project[]> {
  if (!hasSupabaseConfig) {
    return getStoredLocalProjects().filter((p) => p.workspaceId === workspaceId || workspaceId === "northstar-demo");
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, workspace_id, name, description, status, priority, owner_id, due_at, created_by, created_at, updated_at, profiles:owner_id(display_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description || "",
      status: row.status,
      priority: row.priority,
      ownerId: row.owner_id,
      ownerName: owner?.display_name || null,
      dueAt: row.due_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  description?: string;
  status?: Project["status"];
  priority?: Project["priority"];
  dueAt?: string | null;
}): Promise<Project> {
  const validated = CreateProjectSchema.parse(input);

  if (!hasSupabaseConfig) {
    const newProject: Project = {
      id: `proj-local-${Date.now()}`,
      workspaceId: validated.workspaceId,
      name: validated.name,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      ownerId: "demo-user-1",
      ownerName: "Ateeb Fatmi",
      dueAt: validated.dueAt || null,
      createdBy: "demo-user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const projects = getStoredLocalProjects();
    saveStoredLocalProjects([newProject, ...projects]);
    return newProject;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: validated.workspaceId,
      name: validated.name,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      owner_id: user.id,
      due_at: validated.dueAt,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    description: data.description,
    status: data.status,
    priority: data.priority,
    ownerId: data.owner_id,
    dueAt: data.due_at,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateProject(input: {
  workspaceId: string;
  projectId: string;
  name?: string;
  description?: string;
  status?: Project["status"];
  priority?: Project["priority"];
  dueAt?: string | null;
}): Promise<void> {
  const validated = UpdateProjectSchema.parse(input);

  if (!hasSupabaseConfig) {
    const projects = getStoredLocalProjects().map((p) => {
      if (p.id !== validated.projectId) return p;
      return {
        ...p,
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.priority !== undefined && { priority: validated.priority }),
        ...(validated.dueAt !== undefined && { dueAt: validated.dueAt }),
        updatedAt: new Date().toISOString(),
      };
    });
    saveStoredLocalProjects(projects);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (validated.name !== undefined) updates.name = validated.name;
  if (validated.description !== undefined) updates.description = validated.description;
  if (validated.status !== undefined) updates.status = validated.status;
  if (validated.priority !== undefined) updates.priority = validated.priority;
  if (validated.dueAt !== undefined) updates.due_at = validated.dueAt;

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", validated.projectId)
    .eq("workspace_id", validated.workspaceId);

  if (error) throw new Error(error.message);
}

export async function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  if (!hasSupabaseConfig) {
    const projects = getStoredLocalProjects().filter((p) => p.id !== projectId);
    saveStoredLocalProjects(projects);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
}

/* Tasks Service API */

export async function fetchWorkspaceTasks(
  workspaceId: string,
  filters?: { projectId?: string; assigneeId?: string; status?: TaskItem["status"] },
): Promise<TaskItem[]> {
  if (!hasSupabaseConfig) {
    let tasks = getStoredLocalTasks().filter((t) => t.workspaceId === workspaceId || workspaceId === "northstar-demo");
    if (filters?.projectId) tasks = tasks.filter((t) => t.projectId === filters.projectId);
    if (filters?.assigneeId) tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
    return tasks;
  }

  const supabase = createSupabaseBrowserClient();
  let query = supabase
    .from("tasks")
    .select("id, workspace_id, project_id, title, description, status, priority, assignee_id, due_at, position, created_by, created_at, updated_at, projects(name), profiles:assignee_id(display_name)")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const proj = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const assignee = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      projectId: row.project_id,
      projectName: proj?.name || null,
      title: row.title,
      description: row.description || "",
      status: row.status,
      priority: row.priority,
      assigneeId: row.assignee_id,
      assigneeName: assignee?.display_name || null,
      dueAt: row.due_at,
      position: row.position || 0,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function createTask(input: {
  workspaceId: string;
  projectId?: string | null;
  title: string;
  description?: string;
  status?: TaskItem["status"];
  priority?: TaskItem["priority"];
  assigneeId?: string | null;
  dueAt?: string | null;
}): Promise<TaskItem> {
  const validated = CreateTaskSchema.parse(input);

  if (!hasSupabaseConfig) {
    const localProjects = getStoredLocalProjects();
    const proj = localProjects.find((p) => p.id === validated.projectId);

    const newTask: TaskItem = {
      id: `task-local-${Date.now()}`,
      workspaceId: validated.workspaceId,
      projectId: validated.projectId || null,
      projectName: proj?.name || "Product",
      title: validated.title,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      assigneeId: validated.assigneeId || "demo-user-1",
      assigneeName: "Ateeb Fatmi",
      dueAt: validated.dueAt || null,
      position: Date.now(),
      createdBy: "demo-user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tasks = getStoredLocalTasks();
    saveStoredLocalTasks([newTask, ...tasks]);
    return newTask;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: validated.workspaceId,
      project_id: validated.projectId || null,
      title: validated.title,
      description: validated.description,
      status: validated.status,
      priority: validated.priority,
      assignee_id: validated.assigneeId || null,
      due_at: validated.dueAt || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    workspaceId: data.workspace_id,
    projectId: data.project_id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    assigneeId: data.assignee_id,
    dueAt: data.due_at,
    position: data.position,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateTask(input: {
  workspaceId: string;
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskItem["status"];
  priority?: TaskItem["priority"];
  assigneeId?: string | null;
  projectId?: string | null;
  dueAt?: string | null;
  position?: number;
}): Promise<void> {
  const validated = UpdateTaskSchema.parse(input);

  if (!hasSupabaseConfig) {
    const projects = getStoredLocalProjects();
    const tasks = getStoredLocalTasks().map((t) => {
      if (t.id !== validated.taskId) return t;
      const proj = validated.projectId ? projects.find((p) => p.id === validated.projectId) : undefined;
      return {
        ...t,
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.priority !== undefined && { priority: validated.priority }),
        ...(validated.assigneeId !== undefined && { assigneeId: validated.assigneeId }),
        ...(validated.projectId !== undefined && { projectId: validated.projectId, projectName: proj?.name || t.projectName }),
        ...(validated.dueAt !== undefined && { dueAt: validated.dueAt }),
        ...(validated.position !== undefined && { position: validated.position }),
        updatedAt: new Date().toISOString(),
      };
    });
    saveStoredLocalTasks(tasks);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (validated.title !== undefined) updates.title = validated.title;
  if (validated.description !== undefined) updates.description = validated.description;
  if (validated.status !== undefined) updates.status = validated.status;
  if (validated.priority !== undefined) updates.priority = validated.priority;
  if (validated.assigneeId !== undefined) updates.assignee_id = validated.assigneeId;
  if (validated.projectId !== undefined) updates.project_id = validated.projectId;
  if (validated.dueAt !== undefined) updates.due_at = validated.dueAt;
  if (validated.position !== undefined) updates.position = validated.position;

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", validated.taskId)
    .eq("workspace_id", validated.workspaceId);

  if (error) throw new Error(error.message);
}

export async function deleteTask(workspaceId: string, taskId: string): Promise<void> {
  if (!hasSupabaseConfig) {
    const tasks = getStoredLocalTasks().filter((t) => t.id !== taskId);
    saveStoredLocalTasks(tasks);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
}

/* Task Comments Service API */

export async function fetchTaskComments(workspaceId: string, taskId: string): Promise<TaskComment[]> {
  if (!hasSupabaseConfig) {
    return getStoredLocalComments().filter((c) => c.taskId === taskId);
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("id, task_id, author_id, body, created_at, profiles:author_id(display_name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      taskId: row.task_id,
      authorId: row.author_id,
      authorName: author?.display_name || "Teammate",
      body: row.body,
      createdAt: row.created_at,
    };
  });
}

export async function createTaskComment(input: {
  workspaceId: string;
  taskId: string;
  body: string;
}): Promise<TaskComment> {
  const validated = CreateCommentSchema.parse(input);

  if (!hasSupabaseConfig) {
    const newComment: TaskComment = {
      id: `comment-local-${Date.now()}`,
      taskId: validated.taskId,
      authorId: "demo-user-1",
      authorName: "Ateeb Fatmi",
      body: validated.body,
      createdAt: new Date().toISOString(),
    };
    const comments = getStoredLocalComments();
    saveStoredLocalComments([...comments, newComment]);
    return newComment;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: validated.taskId,
      author_id: user.id,
      body: validated.body,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    taskId: data.task_id,
    authorId: data.author_id,
    authorName: user.user_metadata?.display_name || "Teammate",
    body: data.body,
    createdAt: data.created_at,
  };
}

export async function deleteTaskComment(workspaceId: string, commentId: string): Promise<void> {
  if (!hasSupabaseConfig) {
    const comments = getStoredLocalComments().filter((c) => c.id !== commentId);
    saveStoredLocalComments(comments);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("task_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw new Error(error.message);
}
