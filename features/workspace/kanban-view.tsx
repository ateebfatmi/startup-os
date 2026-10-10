"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Filter,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { initialsFor } from "@/features/auth/auth-utils";
import type { Project, TaskComment, TaskDbStatus, TaskItem, TaskPriority } from "./project-types";
import {
  createTask,
  createTaskComment,
  deleteTask,
  deleteTaskComment,
  fetchTaskComments,
  fetchWorkspaceProjects,
  fetchWorkspaceTasks,
  updateTask,
} from "./project-service";
import { fetchWorkspaceMembers } from "./member-service";
import type { WorkspaceMember } from "./invitations";
import { hasSupabaseConfig } from "@/lib/supabase/client";

const COLUMN_CONFIG: { id: TaskDbStatus; title: string; style: string }[] = [
  { id: "todo", title: "Todo", style: "border-gray-200" },
  { id: "in_progress", title: "In progress", style: "border-blue-200" },
  { id: "in_review", title: "In review", style: "border-amber-200" },
  { id: "done", title: "Done", style: "border-emerald-200" },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800 font-bold",
  high: "bg-[#ffe0d1] text-[#8a3d24] font-semibold",
  medium: "bg-black/5 text-[#4a5568]",
  low: "bg-gray-100 text-gray-600",
};

export function KanbanView({
  workspaceId,
  initialProjectId,
}: {
  workspaceId: string;
  initialProjectId?: string | null;
}) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId || "all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Task Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");
  const [newDueAt, setNewDueAt] = useState("");
  const [creating, setCreating] = useState(false);

  // Task Detail Modal
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedTasks, fetchedProjects, fetchedMembers] = await Promise.all([
        fetchWorkspaceTasks(workspaceId),
        fetchWorkspaceProjects(workspaceId),
        fetchWorkspaceMembers(workspaceId),
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setMembers(fetchedMembers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load tasks";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadComments = async (taskId: string) => {
    setLoadingComments(true);
    try {
      const data = await fetchTaskComments(workspaceId, taskId);
      setComments(data);
    } catch {
      // ignore
    } finally {
      setLoadingComments(false);
    }
  };

  const openTaskDetail = (task: TaskItem) => {
    setActiveTask(task);
    void loadComments(task.id);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createTask({
        workspaceId,
        projectId: newProjectId || null,
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: "todo",
        priority: newPriority,
        assigneeId: newAssigneeId || null,
        dueAt: newDueAt ? new Date(newDueAt).toISOString() : null,
      });
      setNewTitle("");
      setNewDescription("");
      setCreateModalOpen(false);
      await reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleMoveTask = async (taskId: string, nextStatus: TaskDbStatus) => {
    try {
      setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
      await updateTask({
        workspaceId,
        taskId,
        status: nextStatus,
      });
      if (activeTask && activeTask.id === taskId) {
        setActiveTask((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move task";
      setError(msg);
      await reload();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(workspaceId, taskId);
      setActiveTask(null);
      await reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete task";
      setError(msg);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || !activeTask) return;
    setPostingComment(true);
    try {
      const newComment = await createTaskComment({
        workspaceId,
        taskId: activeTask.id,
        body: commentBody.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post comment";
      setError(msg);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteTaskComment(workspaceId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete comment";
      setError(msg);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedProject !== "all" && t.projectId !== selectedProject) return false;
    if (selectedAssignee !== "all" && t.assigneeId !== selectedAssignee) return false;
    if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-[#e0edbe] text-[#39571c]">TASK KANBAN</Badge>
            {!hasSupabaseConfig && (
              <Badge className="bg-[#ffeedd] text-[#a84b17]">Local Demo Data</Badge>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#17211b]">Launch Board</h2>
          <p className="mt-1 text-sm text-[#68736b]">
            Database-backed workflow board with task comments, assignments, deadlines, and priorities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus size={17} /> Add Task
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/[.08] bg-[#fffdf7] p-3 text-xs shadow-sm">
        <div className="flex items-center gap-1.5 font-bold text-[#68736b]">
          <Filter size={15} /> Filter:
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="h-9 rounded-xl border border-black/15 bg-white px-2.5 outline-none focus:border-[#173f2b]"
          aria-label="Filter by project"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="h-9 rounded-xl border border-black/15 bg-white px-2.5 outline-none focus:border-[#173f2b]"
          aria-label="Filter by assignee"
        >
          <option value="all">All Teammates</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="h-9 rounded-xl border border-black/15 bg-white px-2.5 outline-none focus:border-[#173f2b]"
          aria-label="Filter by priority"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-black/15 bg-white px-2.5 py-1 min-w-[200px]">
          <Search size={14} className="text-[#68736b]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks…"
            className="w-full bg-transparent outline-none text-xs"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#68736b]">
          <Loader2 className="animate-spin" size={24} />
          <span className="ml-2 text-sm font-medium">Loading workspace tasks…</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMN_CONFIG.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <section
                key={col.id}
                className="flex min-h-[400px] flex-col rounded-[22px] bg-black/[.035] p-3"
              >
                <div className="mb-3 flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-[#17211b]">{col.title}</h3>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold text-[#68736b]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-black/10 bg-white/40 p-6 text-center text-xs text-[#68736b]">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <article
                        key={t.id}
                        onClick={() => openTaskDetail(t)}
                        className="group relative cursor-pointer rounded-2xl border border-black/[.08] bg-[#fffdf7] p-3.5 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge className="bg-black/5 text-[10px] text-[#68736b]">
                            {t.projectName || "General"}
                          </Badge>
                          <Badge className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}>
                            {t.priority}
                          </Badge>
                        </div>

                        <h4 className="mt-2 text-sm font-bold text-[#17211b] line-clamp-2">
                          {t.title}
                        </h4>

                        {t.description && (
                          <p className="mt-1 text-xs text-[#68736b] line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-2 text-[11px] text-[#68736b]">
                          <div className="flex items-center gap-1">
                            <User size={13} />
                            <span>{t.assigneeName || "Unassigned"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {t.dueAt && (
                              <div className="flex items-center gap-1">
                                <CalendarDays size={13} />
                                <span>
                                  {new Date(t.dueAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}

                            {/* Status Quick Changer */}
                            <select
                              value={t.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                void handleMoveTask(t.id, e.target.value as TaskDbStatus)
                              }
                              className="rounded-lg border border-black/15 bg-white px-1.5 py-0.5 text-[10px] outline-none"
                              aria-label={`Change status for ${t.title}`}
                            >
                              <option value="todo">Todo</option>
                              <option value="in_progress">In progress</option>
                              <option value="in_review">In review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <Dialog open title="Add New Task" onClose={() => setCreateModalOpen(false)}>
          <form onSubmit={(e) => void handleCreateTask(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Task Title
              </label>
              <input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Implement WebRTC signaling candidate buffer"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm outline-none focus:border-[#173f2b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Description
              </label>
              <textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Details, requirements, or acceptance criteria…"
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white p-3 text-sm outline-none focus:border-[#173f2b]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                  Project
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
                >
                  <option value="">No Project (General)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                  Assignee
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newDueAt}
                  onChange={(e) => setNewDueAt(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-[#173f2b] text-white">
                {creating ? <Loader2 className="animate-spin" size={16} /> : "Create Task"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Task Detail & Comments Modal */}
      {activeTask && (
        <Dialog open title={activeTask.title} onClose={() => setActiveTask(null)}>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-black/5 text-[#68736b]">
                {activeTask.projectName || "General"}
              </Badge>
              <Badge className={PRIORITY_STYLES[activeTask.priority]}>
                Priority: {activeTask.priority}
              </Badge>
              <span className="ml-auto text-[#68736b]">
                Assigned to: <strong>{activeTask.assigneeName || "Unassigned"}</strong>
              </span>
            </div>

            {activeTask.description && (
              <p className="rounded-xl bg-[#f4f1e8] p-3.5 text-xs leading-6 text-[#17211b]">
                {activeTask.description}
              </p>
            )}

            {/* Task Controls */}
            <div className="flex items-center justify-between border-y border-black/10 py-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#68736b]">Status:</span>
                <select
                  value={activeTask.status}
                  onChange={(e) =>
                    void handleMoveTask(activeTask.id, e.target.value as TaskDbStatus)
                  }
                  className="rounded-lg border border-black/15 bg-white px-2 py-1 outline-none font-semibold"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In progress</option>
                  <option value="in_review">In review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDeleteTask(activeTask.id)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} /> Delete Task
              </Button>
            </div>

            {/* Comments Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#17211b]">
                <MessageSquare size={16} /> Comments ({comments.length})
              </div>

              {loadingComments ? (
                <div className="py-4 text-center text-xs text-[#68736b]">
                  <Loader2 className="animate-spin" size={16} />
                </div>
              ) : comments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/10 bg-white/50 p-4 text-center text-xs text-[#68736b]">
                  No comments yet. Start the discussion below.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-black/[.06] bg-white p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#17211b]">
                        <span className="flex items-center gap-1.5">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#efad73] text-[9px] font-bold">
                            {initialsFor(c.authorName)}
                          </span>
                          {c.authorName}
                        </span>
                        <span className="text-[10px] text-[#68736b]">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[#333] leading-5">{c.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <form onSubmit={(e) => void handleAddComment(e)} className="flex gap-2 pt-2">
                <input
                  required
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  className="h-10 flex-1 rounded-xl border border-black/15 bg-white px-3 text-xs outline-none focus:border-[#173f2b]"
                />
                <Button type="submit" disabled={postingComment} size="sm" className="bg-[#173f2b] text-white">
                  {postingComment ? <Loader2 className="animate-spin" size={14} /> : "Comment"}
                </Button>
              </form>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
