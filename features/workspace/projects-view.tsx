"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Check,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { initialsFor } from "@/features/auth/auth-utils";
import type { Project, ProjectStatus, TaskPriority } from "./project-types";
import {
  createProject,
  deleteProject,
  fetchWorkspaceProjects,
  updateProject,
} from "./project-service";
import { hasSupabaseConfig } from "@/lib/supabase/client";

const STATUS_BADGES: Record<ProjectStatus, { label: string; style: string }> = {
  active: { label: "Active", style: "bg-[#c8f560] text-[#173f2b] font-bold" },
  planned: { label: "Planned", style: "bg-blue-100 text-blue-800 font-semibold" },
  paused: { label: "Paused", style: "bg-amber-100 text-amber-800 font-semibold" },
  completed: { label: "Completed", style: "bg-emerald-100 text-emerald-800 font-semibold" },
  archived: { label: "Archived", style: "bg-gray-100 text-gray-700 font-semibold" },
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; style: string }> = {
  urgent: { label: "Urgent", style: "bg-red-100 text-red-800 font-bold" },
  high: { label: "High", style: "bg-[#ffe0d1] text-[#8a3d24] font-semibold" },
  medium: { label: "Medium", style: "bg-black/5 text-[#4a5568]" },
  low: { label: "Low", style: "bg-gray-100 text-gray-600" },
};

export function ProjectsView({
  workspaceId,
  onSelectProject,
}: {
  workspaceId: string;
  onSelectProject?: (projectId: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkspaceProjects(workspaceId);
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load projects";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreateModal = () => {
    setEditingProject(null);
    setName("");
    setDescription("");
    setStatus("active");
    setPriority("medium");
    setDueAt("");
    setModalOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setName(proj.name);
    setDescription(proj.description);
    setStatus(proj.status);
    setPriority(proj.priority);
    setDueAt(proj.dueAt ? proj.dueAt.slice(0, 10) : "");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingProject) {
        await updateProject({
          workspaceId,
          projectId: editingProject.id,
          name: name.trim(),
          description: description.trim(),
          status,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        });
        setSuccess("Project updated successfully");
      } else {
        await createProject({
          workspaceId,
          name: name.trim(),
          description: description.trim(),
          status,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        });
        setSuccess("Project created successfully");
      }
      setModalOpen(false);
      await reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save project";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (proj: Project) => {
    if (!confirm(`Are you sure you want to delete "${proj.name}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await deleteProject(workspaceId, proj.id);
      setSuccess("Project deleted");
      await reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project";
      setError(msg);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-[#e0edbe] text-[#39571c]">PROJECT PORTFOLIO</Badge>
            {!hasSupabaseConfig && (
              <Badge className="bg-[#ffeedd] text-[#a84b17]">Local Demo Data</Badge>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#17211b]">Projects</h2>
          <p className="mt-1 text-sm text-[#68736b]">
            Track strategy, milestones, and high-impact workspace initiatives.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <Plus size={17} /> New project
          </Button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-2xl border border-green-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <div className="flex items-center gap-2.5">
              <Check size={18} className="shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#68736b]">
          <Loader2 className="animate-spin" size={24} />
          <span className="ml-2 text-sm font-medium">Loading workspace projects…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-12 text-center text-[#68736b]">
          <FolderKanban className="mx-auto mb-3 text-black/30" size={36} />
          <h3 className="text-base font-bold text-[#17211b]">No active projects</h3>
          <p className="mt-1 text-sm">Create your first project to align tasks and launch goals.</p>
          <Button className="mt-4" onClick={openCreateModal}>
            <Plus size={16} /> Create Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="flex flex-col justify-between rounded-2xl border border-black/[.08] bg-[#fffdf7] p-5 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Badge className={STATUS_BADGES[proj.status].style}>
                    {STATUS_BADGES[proj.status].label}
                  </Badge>
                  <Badge className={PRIORITY_BADGES[proj.priority].style}>
                    {PRIORITY_BADGES[proj.priority].label}
                  </Badge>
                </div>

                <h3
                  onClick={() => onSelectProject?.(proj.id)}
                  className="mt-3 cursor-pointer text-lg font-bold text-[#17211b] hover:text-[#173f2b] transition"
                >
                  {proj.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#68736b]">
                  {proj.description || "No description provided."}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between text-xs text-[#68736b]">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>{proj.ownerName || "Teammate"}</span>
                </div>
                {proj.dueAt && (
                  <div className="flex items-center gap-1">
                    <CalendarDays size={14} />
                    <span>
                      {new Date(proj.dueAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(proj)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDelete(proj)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <Dialog
          open
          title={editingProject ? "Edit Project" : "Create New Project"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Project Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q4 Growth Launch"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm outline-none focus:border-[#173f2b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly outline goals and target outcomes…"
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white p-3 text-sm outline-none focus:border-[#173f2b]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#173f2b] text-white">
                {submitting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : editingProject ? (
                  "Save Changes"
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
