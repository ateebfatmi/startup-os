"use client";

import { Activity, FileText, FolderKanban, Loader2, MessageSquare, RefreshCw, UserRound, CheckSquare2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchWorkspaceActivity, describeActivity, type ActivityEvent } from "./activity-service";

const TYPE_ICONS = { projects: FolderKanban, tasks: CheckSquare2, task_comments: MessageSquare, shared_documents: FileText, workspace_members: UserRound };

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityView({ workspaceId }: { workspaceId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setEvents(await fetchWorkspaceActivity(workspaceId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load workspace activity"); }
    finally { setLoading(false); }
  }, [workspaceId]);
  useEffect(() => { void reload(); }, [reload]);

  return <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-7">
    <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-bold tracking-[.18em] text-[#4b7a5e]">AUDIT TRAIL</div><h2 className="mt-2 text-3xl font-bold tracking-tight">Workspace activity</h2><p className="mt-1 text-sm text-[#68736b]">A durable record of important changes across your team.</p></div><Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</Button></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <section className="overflow-hidden rounded-[24px] border border-black/[.07] bg-[#fffdf7]">
      {loading ? <div className="flex items-center justify-center gap-2 p-14 text-sm text-[#68736b]"><Loader2 className="animate-spin" size={20} /> Loading activity…</div> : events.length === 0 ? <div className="p-14 text-center"><Activity className="mx-auto text-black/25" /><h3 className="mt-3 font-bold">No activity yet</h3><p className="mt-1 text-sm text-[#68736b]">Project, task, file, and membership changes will appear here.</p></div> : <div className="divide-y divide-black/[.06]">{events.map((event) => {
        const Icon = TYPE_ICONS[event.objectType as keyof typeof TYPE_ICONS] || Activity;
        return <article key={event.id} className="flex gap-4 p-4 md:p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf1df] text-[#315e45]"><Icon size={18} /></div><div className="min-w-0 flex-1"><p className="text-sm"><strong>{event.actorName}</strong> {describeActivity(event)}</p><p className="mt-1 text-xs text-[#68736b]">{relativeTime(event.createdAt)} · {new Date(event.createdAt).toLocaleString()}</p></div></article>;
      })}</div>}
    </section>
  </div>;
}
