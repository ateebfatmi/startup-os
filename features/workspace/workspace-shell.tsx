"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, CalendarDays, CheckSquare2, ChevronDown, CircleHelp, Command, DoorOpen, FolderKanban, Headphones, LayoutGrid, Loader2, LogOut, Menu, Mic, MicOff, PhoneOff, Plus, Search, Sparkles, Users, Video, VideoOff, Wifi, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { initialsFor } from "@/features/auth/auth-utils";
import { OfficeCanvas } from "@/features/virtual-office/office-canvas";
import { useOfficeStore } from "@/features/virtual-office/store";
import { useMultiplayer } from "@/features/multiplayer/use-multiplayer";
import { useHuddle, type HuddleController } from "@/features/communication/use-huddle";
import type { CallParticipant } from "@/features/communication/types";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { useWorkspaceData } from "./use-workspace-data";
import { TeamView } from "./team-view";
import type { TaskStatus } from "./sample-data";

const nav = [
  { id: "office", label: "Office", icon: DoorOpen },
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "My tasks", icon: CheckSquare2 },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "team", label: "Team", icon: Users },
] as const;

type View = (typeof nav)[number]["id"];

export function WorkspaceShell() {
  const router = useRouter();
  const [identity, setIdentity] = useState({ displayName: "Ateeb Fatmi", workspaceName: "Northstar Labs", workspaceId: "northstar-demo" });
  useEffect(() => {
    const localIdentity = {
      displayName: window.localStorage.getItem("orbit-display-name") || "Ateeb Fatmi",
      workspaceName: window.localStorage.getItem("orbit-workspace-name") || "Northstar Labs",
      workspaceId: window.localStorage.getItem("orbit-workspace-id") || "northstar-demo",
    };
    setIdentity(localIdentity);
    if (!hasSupabaseConfig) return;
    let active = true;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.from("workspace_members").select("workspace_id, workspaces(name)").eq("user_id", user.id).limit(1),
      ]);
      const membership = memberships?.[0] as { workspace_id: string; workspaces: { name?: string } | { name?: string }[] | null } | undefined;
      const relatedWorkspace = Array.isArray(membership?.workspaces) ? membership.workspaces[0] : membership?.workspaces;
      const nextIdentity = {
        displayName: profile?.display_name || localIdentity.displayName,
        workspaceName: relatedWorkspace?.name || localIdentity.workspaceName,
        workspaceId: membership?.workspace_id || localIdentity.workspaceId,
      };
      if (!active) return;
      setIdentity(nextIdentity);
      window.localStorage.setItem("orbit-display-name", nextIdentity.displayName);
      window.localStorage.setItem("orbit-workspace-name", nextIdentity.workspaceName);
      window.localStorage.setItem("orbit-workspace-id", nextIdentity.workspaceId);
    })();
    return () => { active = false; };
  }, []);
  useMultiplayer(identity.workspaceId);
  const huddle = useHuddle(identity.workspaceId, "weekly-product-pulse");
  const [view, setView] = useState<View>("office");
  const [mobileNav, setMobileNav] = useState(false);
  const [rightRail, setRightRail] = useState(true);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const activePanel = useOfficeStore((state) => state.activePanel);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const closePanel = useOfficeStore((state) => state.closePanel);
  const data = useWorkspaceData();
  const localParticipant = Object.values(huddle.participants).find((participant) => participant.isLocal);
  const inCall = huddle.status === "connected";

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-[#f4f1e8]">
      <Sidebar view={view} setView={setView} mobileNav={mobileNav} onClose={() => setMobileNav(false)} workspaceName={identity.workspaceName} onExit={async () => { if (hasSupabaseConfig) await createSupabaseBrowserClient().auth.signOut(); ["orbit-display-name", "orbit-workspace-name", "orbit-workspace-id", "orbit-workspace-type", "orbit-office-template"].forEach((key) => window.localStorage.removeItem(key)); router.push("/login"); router.refresh(); }} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar view={view} onMenu={() => setMobileNav(true)} displayName={identity.displayName} />
        <div className="relative isolate min-h-0 flex-1">
          {view === "office" ? (
            <>
              <div className="absolute inset-0 z-0"><OfficeCanvas /></div>
              <OfficeHud rightRail={rightRail} onToggleRail={() => setRightRail((value) => !value)} tasks={data.tasks} displayName={identity.displayName} />
              <AnimatePresence>
                {nearbyAction && (
                  <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={() => openPanel(nearbyAction.kind)} className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#17211b] px-4 py-3 text-sm font-semibold text-white shadow-2xl">
                    <kbd className="grid h-8 min-w-8 place-items-center rounded-lg bg-white/15 px-2 text-xs">E</kbd>
                    {nearbyAction.label}
                  </motion.button>
                )}
              </AnimatePresence>
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/35 bg-[#fffdf7]/90 p-2 shadow-panel backdrop-blur-md">
                <Button variant={localParticipant?.microphoneEnabled ? "solid" : "outline"} size="icon" onClick={() => inCall ? huddle.toggleMicrophone() : openPanel("meeting")} aria-label={localParticipant?.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}>{localParticipant?.microphoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}</Button>
                <Button variant={localParticipant?.cameraEnabled ? "solid" : "outline"} size="icon" onClick={() => inCall ? huddle.toggleCamera() : openPanel("meeting")} aria-label={localParticipant?.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{localParticipant?.cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}</Button>
                <div className="mx-1 h-6 w-px bg-black/10" />
                <Button variant="outline" size="sm" onClick={() => openPanel("meeting")}><Headphones size={17} /> {inCall ? `${Object.keys(huddle.participants).length} in huddle` : "Start huddle"}</Button>
              </div>
            </>
          ) : <DashboardView view={view} {...data} workspaceId={identity.workspaceId} />}
        </div>
      </div>
      <FeatureDialog kind={activePanel} onClose={closePanel} tasks={data.tasks} moveTask={data.moveTask} addTask={data.addTask} huddle={huddle} />
    </main>
  );
}

function Sidebar({ view, setView, mobileNav, onClose, workspaceName, onExit }: { view: View; setView: (view: View) => void; mobileNav: boolean; onClose: () => void; workspaceName: string; onExit: () => Promise<void> }) {
  return <>
    {mobileNav && <button className="fixed inset-0 z-30 bg-black/35 lg:hidden" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#173f2b] p-3 text-[#f5f0e4] transition-transform lg:static lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c8f560] text-[#173f2b]"><Command size={20} strokeWidth={2.5} /></div><span className="text-lg font-bold tracking-tight">orbit</span></div>
        <button className="lg:hidden" onClick={onClose}><X size={20} /></button>
      </div>
      <button className="my-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.08] p-3 text-left">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff8a4c] text-sm font-bold text-[#311b13]">{initialsFor(workspaceName)}</div>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{workspaceName}</div><div className="text-xs text-white/55">{hasSupabaseConfig ? "Private workspace" : "Local demo"}</div></div><ChevronDown size={16} className="text-white/50" />
      </button>
      <nav className="mt-2 space-y-1" aria-label="Workspace">
        {nav.map((item) => <button key={item.id} onClick={() => { setView(item.id); onClose(); }} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${view === item.id ? "bg-[#c8f560] text-[#173f2b]" : "text-white/67 hover:bg-white/[.07] hover:text-white"}`}><item.icon size={18} /><span>{item.label}</span>{item.id === "tasks" && <span className="ml-auto rounded-full bg-white/10 px-2 text-xs">3</span>}</button>)}
      </nav>
      <div className="mt-auto rounded-2xl bg-[#214d38] p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-[#c8f560]" /> {hasSupabaseConfig ? "Private workspace" : "Demo workspace"}</div>
        <p className="text-xs leading-5 text-white/60">{hasSupabaseConfig ? "Your session and membership are protected by Supabase Auth and RLS." : "Connect Supabase to replace local sample data with your team workspace."}</p>
      </div>
      <button onClick={() => void onExit()} className="mt-2 flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/65 hover:bg-white/[.07]"><LogOut size={18} /> {hasSupabaseConfig ? "Sign out" : "Exit demo"}</button>
    </aside>
  </>;
}

function Topbar({ view, onMenu, displayName }: { view: View; onMenu: () => void; displayName: string }) {
  const title = nav.find((item) => item.id === view)?.label ?? "Office";
  const teammateCount = useOfficeStore((state) => Object.keys(state.remotePlayers).length);
  return <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-black/[.07] bg-[#fffdf7]/95 px-4 backdrop-blur-md md:px-5">
    <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-black/5 lg:hidden" onClick={onMenu}><Menu size={20} /></button>
    <div><h1 className="text-base font-bold tracking-tight">{title}</h1><p className="hidden text-xs text-[#68736b] sm:block">Friday, October 9 · {teammateCount ? `${teammateCount} teammate${teammateCount === 1 ? "" : "s"} nearby` : "Waiting for teammates"}</p></div>
    <div className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-[#68736b] md:flex"><Search size={16} /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search workspace" aria-label="Search workspace" /><kbd className="rounded bg-black/5 px-1.5 py-0.5 text-xs">⌘K</kbd></div>
    <Button variant="ghost" size="icon" aria-label="Help"><CircleHelp size={19} /></Button>
    <Button variant="ghost" size="icon" aria-label="Notifications" className="relative"><Bell size={19} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff8a4c]" /></Button>
    <button className="grid h-9 w-9 place-items-center rounded-full bg-[#efad73] text-xs font-bold" aria-label={`${displayName} profile`}>{initialsFor(displayName)}</button>
  </header>;
}

function OfficeHud({ rightRail, onToggleRail, tasks, displayName }: { rightRail: boolean; onToggleRail: () => void; tasks: { status: string }[]; displayName: string }) {
  const remotePlayers = useOfficeStore((state) => state.remotePlayers);
  const connectionState = useOfficeStore((state) => state.connectionState);
  const transportLabel = useOfficeStore((state) => state.transportLabel);
  const onlineCount = Object.keys(remotePlayers).length + 1;
  return <>
    <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-white/40 bg-[#fffdf7]/[.9] p-3 shadow-panel backdrop-blur-md sm:left-5 sm:top-5">
      <div className="flex items-center gap-2 text-sm font-bold"><span className={`h-2.5 w-2.5 rounded-full ${connectionState === "connected" ? "bg-[#52aa72]" : connectionState === "offline" ? "bg-[#d46b52]" : "animate-pulse bg-[#e5a13e]"}`} /> Open workspace</div>
      <p className="mt-1 text-xs text-[#68736b]">Move with WASD or arrow keys · Press E to interact · {transportLabel}</p>
    </div>
    <button onClick={onToggleRail} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-xl border border-white/50 bg-[#fffdf7]/[.9] shadow-lg backdrop-blur-md lg:hidden"><Users size={18} /></button>
    {rightRail && <aside className="absolute right-5 top-5 z-10 hidden w-64 rounded-[24px] border border-white/45 bg-[#fffdf7]/[.9] p-4 shadow-panel backdrop-blur-md lg:block">
      <div className="flex items-center justify-between"><h2 className="text-sm font-bold">In the office</h2><Badge className="bg-[#e5f3e7] text-[#276141]">{onlineCount} online</Badge></div>
      <div className="mt-4 flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center rounded-full bg-[#efad73] text-xs font-bold">{initialsFor(displayName)}<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#55ac74]" /></div><div><div className="text-sm font-semibold">{displayName}</div><div className="text-xs text-[#68736b]">Open workspace</div></div></div>
      {Object.values(remotePlayers).map((player) => <div key={player.id} className="mt-3 flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white" style={{ background: player.color }}>{player.name.slice(0, 2).toUpperCase()}<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#55ac74]" /></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{player.name}</div><div className="text-xs text-[#68736b]">Moving in the office</div></div></div>)}
      <div className="my-4 h-px bg-black/[.07]" />
      <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#68736b]">Today</span><span className="text-xs text-[#68736b]">{tasks.filter((task) => task.status !== "Done").length} open tasks</span></div>
      <div className="mt-3 rounded-2xl bg-[#173f2b] p-3 text-[#f5f0e4]"><div className="text-xs text-white/55">Next meeting · 3:30 PM</div><div className="mt-1 text-sm font-semibold">Weekly product pulse</div><button onClick={() => useOfficeStore.getState().openPanel("meeting")} className="mt-3 w-full rounded-xl bg-[#c8f560] py-2 text-xs font-bold text-[#173f2b]">View meeting</button></div>
    </aside>}
  </>;
}

function DashboardView({ view, tasks, moveTask, addTask, workspaceId }: { view: Exclude<View, "office">; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"]; workspaceId: string }) {
  if (view === "projects" || view === "tasks") return <div className="h-full overflow-auto p-4 md:p-7"><Kanban tasks={tasks} moveTask={moveTask} addTask={addTask} /></div>;
  if (view === "team") return <div className="h-full overflow-auto p-4 md:p-7"><TeamView workspaceId={workspaceId} /></div>;
  return <div className="h-full overflow-auto p-4 md:p-7"><Overview view={view} tasks={tasks} /></div>;
}

function Overview({ view, tasks }: { view: Exclude<View, "office" | "projects" | "tasks">; tasks: ReturnType<typeof useWorkspaceData>["tasks"] }) {
  return <div className="mx-auto max-w-6xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><Badge className="mb-3 bg-[#e0edbe] text-[#39571c]">NORTHSTAR LABS</Badge><h2 className="text-3xl font-bold tracking-[-.04em]">Good afternoon, Ateeb.</h2><p className="mt-2 text-[#68736b]">Here’s the clearest path through the rest of your day.</p></div><Button><Plus size={17} /> New item</Button></div>
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Active projects" value="3" note="One needs attention" color="#c8f560" /><Metric label="Open tasks" value={String(tasks.filter((task) => task.status !== "Done").length)} note="2 due this week" color="#ffc98b" /><Metric label="Team availability" value="67%" note="2 of 3 online" color="#9dd8c1" /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><section className="rounded-[24px] border border-black/[.07] bg-[#fffdf7] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Priority work</h3><Button variant="ghost" size="sm">View all</Button></div><div className="space-y-2">{tasks.slice(0,3).map((task) => <div key={task.id} className="flex items-center gap-3 rounded-2xl border border-black/[.06] p-3"><button className="h-5 w-5 rounded-md border-2 border-black/20" aria-label={`Complete ${task.title}`} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{task.title}</div><div className="text-xs text-[#68736b]">{task.project} · {task.due}</div></div><Badge className={task.priority === "High" ? "bg-[#ffe0d1] text-[#8a3d24]" : "bg-black/5 text-[#68736b]"}>{task.priority}</Badge></div>)}</div></section><section className="rounded-[24px] bg-[#173f2b] p-5 text-white"><div className="flex items-center justify-between"><h3 className="font-bold">Next up</h3><CalendarDays size={18} className="text-[#c8f560]" /></div><div className="mt-8 text-xs text-white/55">3:30–4:00 PM</div><div className="mt-1 text-xl font-bold">Weekly product pulse</div><p className="mt-2 text-sm leading-6 text-white/65">Align on launch blockers and lock the beta timeline.</p><div className="mt-5 flex -space-x-2"><div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#173f2b] bg-[#efad73] text-xs font-bold text-[#17211b]">AF</div><div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#173f2b] bg-[#a8d4ed] text-xs font-bold text-[#17211b]">SK</div><div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#173f2b] bg-[#d7b4e6] text-xs font-bold text-[#17211b]">MJ</div></div><Button className="mt-5 w-full bg-[#c8f560] text-[#173f2b] hover:bg-[#d5ff77]">Open agenda</Button></section></div>
    {view !== "overview" && <div className="mt-4 rounded-[24px] border border-dashed border-black/15 bg-white/45 p-10 text-center"><h3 className="font-bold capitalize">{view} workspace</h3><p className="mt-2 text-sm text-[#68736b]">This view is wired into the shared application shell and ready for Supabase data.</p></div>}
  </div>;
}

function Metric({ label, value, note, color }: { label: string; value: string; note: string; color: string }) { return <div className="rounded-[24px] border border-black/[.07] bg-[#fffdf7] p-5"><div className="flex items-center justify-between text-sm text-[#68736b]"><span>{label}</span><span className="h-3 w-3 rounded-full" style={{ background: color }} /></div><div className="mt-4 text-4xl font-bold tracking-[-.05em]">{value}</div><div className="mt-1 text-xs text-[#68736b]">{note}</div></div>; }

function Kanban({ tasks, moveTask, addTask }: { tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"] }) {
  const [title, setTitle] = useState("");
  const statuses: TaskStatus[] = ["Todo", "In progress", "In review", "Done"];
  return <div className="mx-auto max-w-7xl"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Badge className="mb-3 bg-[#e0edbe] text-[#39571c]">SPRINT 08</Badge><h2 className="text-3xl font-bold tracking-[-.04em]">Launch board</h2><p className="mt-2 text-[#68736b]">Move work forward one clear decision at a time.</p></div><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (title.trim()) { addTask(title.trim()); setTitle(""); } }}><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none" placeholder="Add a task" aria-label="Task title" /><Button type="submit"><Plus size={17} /> Add</Button></form></div><div className="grid gap-3 lg:grid-cols-4">{statuses.map((status) => <section key={status} className="min-h-72 rounded-[22px] bg-black/[.035] p-3"><div className="mb-3 flex items-center justify-between px-1"><h3 className="text-sm font-bold">{status}</h3><span className="text-xs text-[#68736b]">{tasks.filter((task) => task.status === status).length}</span></div><div className="space-y-2">{tasks.filter((task) => task.status === status).map((task) => <article key={task.id} className="rounded-2xl border border-black/[.07] bg-[#fffdf7] p-3 shadow-sm"><Badge className="bg-black/5 text-[#68736b]">{task.project}</Badge><h4 className="mt-3 text-sm font-semibold leading-5">{task.title}</h4><div className="mt-4 flex items-center justify-between text-xs text-[#68736b]"><span>{task.due}</span><select value={task.status} onChange={(event) => moveTask(task.id, event.target.value as TaskStatus)} className="max-w-24 rounded-lg border border-black/10 bg-white px-2 py-1" aria-label={`Status for ${task.title}`}>{statuses.map((option) => <option key={option}>{option}</option>)}</select></div></article>)}</div></section>)}</div></div>;
}

function FeatureDialog({ kind, onClose, tasks, moveTask, addTask, huddle }: { kind: ReturnType<typeof useOfficeStore.getState>["activePanel"]; onClose: () => void; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"]; huddle: HuddleController }) {
  if (!kind) return null;
  if (kind === "projects") return <Dialog open title="Project table" onClose={onClose}><Kanban tasks={tasks} moveTask={moveTask} addTask={addTask} /></Dialog>;
  if (kind === "whiteboard") return <Dialog open title="Whiteboard" onClose={onClose}><Whiteboard /></Dialog>;
  if (kind === "focus") return <Dialog open title="Focus pod" onClose={onClose}><FocusPanel /></Dialog>;
  return <Dialog open title="Weekly product pulse" onClose={onClose}><MeetingPanel huddle={huddle} /></Dialog>;
}

function Whiteboard() { const [notes, setNotes] = useState(["What must be true?", "Talk to 5 beta teams"]); const [value, setValue] = useState(""); return <div><div className="relative h-72 overflow-hidden rounded-2xl bg-[#f7f0dd] grid-noise p-5">{notes.map((note, index) => <motion.div drag dragConstraints={{ left: -10, right: 360, top: -10, bottom: 160 }} key={`${note}-${index}`} className={`absolute w-40 rotate-[-2deg] rounded-sm p-4 text-sm font-semibold shadow-md ${index % 2 ? "bg-[#ffbc7f] left-52 top-28 rotate-[3deg]" : "bg-[#c8f560] left-8 top-8"}`}>{note}</motion.div>)}</div><form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (value.trim()) { setNotes((current) => [...current, value.trim()]); setValue(""); } }}><input className="h-11 flex-1 rounded-xl border border-black/10 px-3 text-sm" placeholder="Add a sticky note" value={value} onChange={(event) => setValue(event.target.value)} /><Button type="submit">Add note</Button></form><p className="mt-3 text-xs text-[#68736b]">Saved on this device in demo mode. Supabase Realtime enables shared editing when configured.</p></div>; }

function MeetingPanel({ huddle }: { huddle: HuddleController }) {
  const participants = Object.values(huddle.participants);
  const local = participants.find((participant) => participant.isLocal);
  const waiting = huddle.status === "requesting_permission" || huddle.status === "joining";
  return <div>
    <div className="rounded-2xl bg-[#173f2b] p-5 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><Badge className="bg-[#c8f560] text-[#173f2b]">TODAY · 3:30 PM</Badge><p className="mt-4 max-w-md text-sm leading-6 text-white/70">Align on launch blockers, review beta readiness, and leave with one owner per open decision.</p></div><div className="flex items-center gap-2 text-xs text-white/60"><Wifi size={15} /> Peer-to-peer huddle</div></div></div>
    {huddle.status === "idle" || huddle.status === "error" ? <div className="mt-5 rounded-2xl border border-black/[.08] bg-white p-5"><h3 className="font-bold">Choose how to join</h3><p className="mt-2 text-sm leading-6 text-[#68736b]">Your browser will ask before Orbit accesses a microphone or camera. Nothing starts automatically.</p>{huddle.error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{huddle.error}</p>}<div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => void huddle.join(true)}><Video size={17} /> Join with camera</Button><Button variant="outline" onClick={() => void huddle.join(false)}><Mic size={17} /> Audio only</Button></div></div> : null}
    {waiting && <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#eef4ea] p-5 text-sm text-[#315e45]"><Loader2 className="animate-spin" size={18} /> Waiting for media permission…</div>}
    {huddle.status === "connected" && <><div className="mt-5 grid gap-3 sm:grid-cols-2">{participants.map((participant) => <VideoTile key={participant.id} participant={participant} />)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><Button variant={local?.microphoneEnabled ? "solid" : "outline"} size="icon" onClick={huddle.toggleMicrophone} aria-label={local?.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}>{local?.microphoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}</Button><Button variant={local?.cameraEnabled ? "solid" : "outline"} size="icon" onClick={huddle.toggleCamera} aria-label={local?.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{local?.cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}</Button><Button className="ml-auto bg-[#b64b3e] hover:bg-[#9f3f34]" onClick={() => void huddle.leave()}><PhoneOff size={17} /> Leave huddle</Button></div></>}
  </div>;
}

function VideoTile({ participant }: { participant: CallParticipant }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (video.current) video.current.srcObject = participant.stream; }, [participant.stream]);
  return <article className="relative aspect-video overflow-hidden rounded-2xl bg-[#1d3027] text-white"><video ref={video} autoPlay playsInline muted={participant.isLocal} className={`h-full w-full object-cover ${participant.isLocal ? "-scale-x-100" : ""}`} />{!participant.cameraEnabled && <div className="absolute inset-0 grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-[#c8f560] text-xl font-bold text-[#173f2b]">{participant.name.slice(0, 2).toUpperCase()}</div></div>}<div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 pt-8"><span className="text-sm font-semibold">{participant.name}</span><div className="flex items-center gap-1.5">{participant.connectionState === "connecting" && <Loader2 className="animate-spin" size={14} />}{participant.microphoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}</div></div></article>;
}

function FocusPanel() { const [active, setActive] = useState(false); return <div className="text-center"><div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-[10px] border-[#e6eadf] text-3xl font-bold">25:00</div><h3 className="mt-5 text-lg font-bold">Protect one block of attention</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68736b]">Your office presence will show as focusing while this session is active.</p><Button className="mt-5" onClick={() => setActive((value) => !value)}>{active ? "End session" : "Start focus session"}</Button></div>; }
