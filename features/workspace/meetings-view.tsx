"use client";

import { CalendarDays, Clock, ExternalLink, FileText, Link2, Loader2, Plus, Save, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  addMeetingResource,
  deleteMeetingResource,
  fetchMeetingCollaboration,
  saveMeetingNotes,
  type MeetingCollaboration,
} from "./meeting-collaboration-service";
import { createMeeting, fetchMeetings, type Meeting } from "./operating-system-service";

const emptyCollaboration: MeetingCollaboration = { noteId: null, notes: "", resources: [] };

export function MeetingsView({ workspaceId }: { workspaceId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [collaboration, setCollaboration] = useState<MeetingCollaboration>(emptyCollaboration);
  const [notes, setNotes] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [collaborationLoading, setCollaborationLoading] = useState(false);
  const [collaborationSaving, setCollaborationSaving] = useState(false);
  const [collaborationNotice, setCollaborationNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setMeetings(await fetchMeetings(workspaceId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load meetings"); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { void reload(); }, [reload]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startsAt) return;
    setSaving(true); setError(null);
    try {
      const start = new Date(startsAt);
      await createMeeting({ workspaceId, title, agenda, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + duration * 60_000).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      setScheduleOpen(false); setTitle(""); setAgenda(""); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not schedule meeting"); }
    finally { setSaving(false); }
  };

  const openCollaboration = async (meeting: Meeting) => {
    setActiveMeeting(meeting); setCollaborationLoading(true); setCollaborationNotice(null); setError(null);
    try {
      const value = await fetchMeetingCollaboration(workspaceId, meeting.id);
      setCollaboration(value); setNotes(value.notes);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load meeting workspace"); }
    finally { setCollaborationLoading(false); }
  };

  const reloadCollaboration = async () => {
    if (!activeMeeting) return;
    const value = await fetchMeetingCollaboration(workspaceId, activeMeeting.id);
    setCollaboration(value); setNotes(value.notes);
  };

  const saveNotes = async () => {
    if (!activeMeeting) return;
    setCollaborationSaving(true); setError(null); setCollaborationNotice(null);
    try {
      await saveMeetingNotes({ workspaceId, meetingId: activeMeeting.id, notes });
      await reloadCollaboration(); setCollaborationNotice("Meeting notes saved");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save meeting notes"); }
    finally { setCollaborationSaving(false); }
  };

  const addResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeMeeting) return;
    setCollaborationSaving(true); setError(null); setCollaborationNotice(null);
    try {
      await addMeetingResource({ workspaceId, meetingId: activeMeeting.id, title: resourceTitle, url: resourceUrl, description: resourceDescription });
      setResourceTitle(""); setResourceUrl(""); setResourceDescription("");
      await reloadCollaboration(); setCollaborationNotice("Resource linked");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not link resource"); }
    finally { setCollaborationSaving(false); }
  };

  const removeResource = async (resourceId: string) => {
    if (!activeMeeting) return;
    setCollaborationSaving(true); setError(null);
    try { await deleteMeetingResource(workspaceId, activeMeeting.id, resourceId); await reloadCollaboration(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove resource"); }
    finally { setCollaborationSaving(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-7">
    <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-bold tracking-[.18em] text-[#4b7a5e]">TEAM CALENDAR</div><h2 className="mt-2 text-3xl font-bold">Meetings</h2><p className="mt-1 text-sm text-[#68736b]">Schedule decisions, capture durable notes, and keep the supporting context together.</p></div><Button onClick={() => setScheduleOpen(true)}><Plus size={17} /> Schedule meeting</Button></div>
    {error && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loading ? <div className="grid place-items-center p-16"><Loader2 className="animate-spin" /></div> : <div className="grid gap-4 md:grid-cols-2">{meetings.map((meeting) => <article key={meeting.id} className="rounded-[24px] border border-black/[.07] bg-[#fffdf7] p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-[#e5f3e7] px-2.5 py-1 text-[10px] font-bold uppercase text-[#276141]">{meeting.status}</span><Video size={18} className="text-[#4b7a5e]" /></div><h3 className="mt-4 text-lg font-bold">{meeting.title}</h3><p className="mt-2 min-h-10 text-sm leading-6 text-[#68736b]">{meeting.agenda || "No agenda yet."}</p><div className="mt-4 flex flex-wrap gap-3 text-xs text-[#526057]"><span className="flex items-center gap-1.5"><CalendarDays size={14} /> {new Date(meeting.startsAt).toLocaleDateString()}</span><span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(meeting.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><Button variant="outline" className="mt-4 w-full" onClick={() => void openCollaboration(meeting)}><FileText size={16} /> Notes & resources</Button></article>)}</div>}

    <Dialog open={scheduleOpen} title="Schedule a meeting" onClose={() => setScheduleOpen(false)}><form className="space-y-4" onSubmit={submit}><Field label="Title"><input required value={title} onChange={(event) => setTitle(event.target.value)} className="input" placeholder="Weekly product pulse" /></Field><Field label="Agenda"><textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} className="min-h-24 w-full rounded-xl border border-black/10 p-3 outline-none" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Starts"><input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="input" /></Field><Field label="Duration"><select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="input"><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></Field></div><Button type="submit" className="w-full" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={17} /> : <CalendarDays size={17} />} Schedule meeting</Button></form></Dialog>

    <Dialog open={Boolean(activeMeeting)} title={activeMeeting ? `${activeMeeting.title} workspace` : "Meeting workspace"} onClose={() => { setActiveMeeting(null); setCollaborationNotice(null); }}>
      {collaborationLoading ? <div className="grid place-items-center p-14"><Loader2 className="animate-spin" /></div> : <div className="space-y-6">
        {collaborationNotice && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{collaborationNotice}</div>}
        <section><div className="mb-2 flex items-center justify-between"><div><h3 className="font-bold">Shared notes</h3><p className="text-xs text-[#68736b]">Visible and editable by workspace members.</p></div><Button size="sm" onClick={() => void saveNotes()} disabled={collaborationSaving}>{collaborationSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Save notes</Button></div><textarea aria-label="Shared meeting notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={20000} placeholder="Decisions, action items, risks, and follow-ups…" className="min-h-44 w-full rounded-2xl border border-black/10 bg-white p-4 text-sm leading-6 outline-none focus:border-[#4b7a5e]" /><div className="mt-1 text-right text-[10px] text-[#879087]">{notes.length.toLocaleString()} / 20,000</div></section>
        <section className="border-t border-black/10 pt-5"><h3 className="flex items-center gap-2 font-bold"><Link2 size={16} /> Linked resources</h3><form className="mt-3 grid gap-2" onSubmit={addResource}><div className="grid gap-2 sm:grid-cols-2"><input aria-label="Resource title" required value={resourceTitle} onChange={(event) => setResourceTitle(event.target.value)} placeholder="Launch brief" className="input" /><input aria-label="Resource URL" required type="url" value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} placeholder="https://…" className="input" /></div><input aria-label="Resource description" value={resourceDescription} onChange={(event) => setResourceDescription(event.target.value)} placeholder="Optional context" className="input" /><Button type="submit" variant="outline" disabled={collaborationSaving}><Plus size={15} /> Link resource</Button></form><div className="mt-4 space-y-2">{collaboration.resources.length ? collaboration.resources.map((resource) => <div key={resource.id} className="flex items-start gap-3 rounded-2xl bg-black/[.035] p-3"><a href={resource.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-sm font-semibold text-[#245a3d]">{resource.title}<ExternalLink size={13} /></div>{resource.description && <div className="mt-1 text-xs text-[#68736b]">{resource.description}</div>}<div className="mt-1 truncate text-[10px] text-[#879087]">{resource.url}</div></a><button aria-label={`Remove ${resource.title}`} onClick={() => void removeResource(resource.id)} disabled={collaborationSaving} className="grid h-8 w-8 place-items-center rounded-lg text-[#8b4a43] hover:bg-red-50"><Trash2 size={15} /></button></div>) : <div className="rounded-2xl border border-dashed border-black/10 p-5 text-center text-xs text-[#879087]">No resources linked yet.</div>}</div></section>
      </div>}
    </Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}<div className="mt-2">{children}</div></label>;
}
