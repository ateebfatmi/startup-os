"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, BarChart3, Bot, Bell, CalendarDays, CheckSquare2, ChevronDown, CircleHelp, Coffee, Command, CreditCard, DoorOpen, Files, FolderKanban, Headphones, LayoutGrid, Loader2, LogOut, Maximize2, Menu, Mic, MicOff, MonitorUp, Moon, Music, Palette, PenTool, PhoneOff, Plug, Plus, Radio, Search, Sparkles, Sun, Sunset, Target, User, Users, Video, VideoOff, Wifi, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { initialsFor } from "@/features/auth/auth-utils";
import { OfficeCanvas } from "@/features/virtual-office/office-canvas";
import { useOfficeStore } from "@/features/virtual-office/store";
import { useMultiplayer } from "@/features/multiplayer/use-multiplayer";
import { useHuddle, type HuddleController } from "@/features/communication/use-huddle";
import type { CallParticipant } from "@/features/communication/types";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { useWorkspaceData } from "./use-workspace-data";
import { TeamView } from "./team-view";
import { ProjectsView } from "./projects-view";
import { KanbanView } from "./kanban-view";
import { AIAssistantPanel } from "./ai-assistant-panel";
import { WhiteboardPanel } from "./whiteboard-panel";
import type { TaskStatus } from "./sample-data";
import type { Availability } from "@/features/virtual-office/types";
import { ActivityView } from "./activity-view";
import { DocumentsView } from "./documents-view";
import { DEMO_WORKSPACE, fetchMyWorkspaces, type WorkspaceSummary } from "./workspace-service";
import { loadOfficeDesign } from "./office-design-service";
import { OfficeDesignView } from "./office-design-view";
import { MeetingsView } from "./meetings-view";
import { GoalsView } from "./goals-view";
import { fetchNotifications, markNotificationRead, type WorkspaceNotification } from "./operating-system-service";
import { BillingView } from "./billing-view";
import { AnalyticsView } from "./analytics-view";
import { IntegrationsView } from "./integrations-view";
import { loadOfficeObjects } from "./office-object-service";

const nav = [
  { id: "office", label: "Office", icon: DoorOpen },
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "My tasks", icon: CheckSquare2 },
  { id: "goals", label: "Goals", icon: Target },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "files", label: "Files", icon: Files },
  { id: "whiteboard", label: "Whiteboard", icon: PenTool },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "design", label: "Office design", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "team", label: "Team", icon: Users },
] as const;

type View = (typeof nav)[number]["id"];

export function WorkspaceShell() {
  const router = useRouter();
  const [identity, setIdentity] = useState<{ displayName: string; workspaceName: string; workspaceId: string; workspaceRole: WorkspaceSummary["role"] }>({ displayName: "Ateeb Fatmi", workspaceName: "Northstar Labs", workspaceId: "northstar-demo", workspaceRole: "owner" });
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([DEMO_WORKSPACE]);
  useEffect(() => {
    const localIdentity = {
      displayName: window.localStorage.getItem("orbit-display-name") || "Ateeb Fatmi",
      workspaceName: window.localStorage.getItem("orbit-workspace-name") || "Northstar Labs",
      workspaceId: window.localStorage.getItem("orbit-workspace-id") || "northstar-demo",
      workspaceRole: "owner" as WorkspaceSummary["role"],
    };
    setIdentity(localIdentity);
    if (!hasSupabaseConfig) return;
    let active = true;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, availableWorkspaces] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        fetchMyWorkspaces(),
      ]);
      const selectedWorkspace = availableWorkspaces.find((workspace) => workspace.id === localIdentity.workspaceId) || availableWorkspaces[0];
      const nextIdentity = {
        displayName: profile?.display_name || localIdentity.displayName,
        workspaceName: selectedWorkspace?.name || localIdentity.workspaceName,
        workspaceId: selectedWorkspace?.id || localIdentity.workspaceId,
        workspaceRole: selectedWorkspace?.role || localIdentity.workspaceRole,
      };
      if (!active) return;
      setWorkspaces(availableWorkspaces);
      setIdentity(nextIdentity);
      window.localStorage.setItem("orbit-display-name", nextIdentity.displayName);
      window.localStorage.setItem("orbit-workspace-name", nextIdentity.workspaceName);
      window.localStorage.setItem("orbit-workspace-id", nextIdentity.workspaceId);
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([loadOfficeDesign(identity.workspaceId), loadOfficeObjects(identity.workspaceId)]).then(([design, objects]) => {
      if (active) { useOfficeStore.getState().setOfficeDesign(design); useOfficeStore.getState().setOfficeObjects(objects); }
    }).catch((error) => console.error("Could not load office design", error));
    return () => { active = false; };
  }, [identity.workspaceId]);
  const selectWorkspace = (workspace: WorkspaceSummary) => {
    setIdentity((current) => ({ ...current, workspaceId: workspace.id, workspaceName: workspace.name, workspaceRole: workspace.role }));
    window.localStorage.setItem("orbit-workspace-id", workspace.id);
    window.localStorage.setItem("orbit-workspace-name", workspace.name);
    useOfficeStore.getState().clearRemotePlayers();
  };
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
      <Sidebar view={view} setView={setView} mobileNav={mobileNav} onClose={() => setMobileNav(false)} workspaceName={identity.workspaceName} workspaceId={identity.workspaceId} workspaces={workspaces} onSelectWorkspace={selectWorkspace} onExit={async () => { if (hasSupabaseConfig) await createSupabaseBrowserClient().auth.signOut(); ["orbit-display-name", "orbit-workspace-name", "orbit-workspace-id", "orbit-workspace-type", "orbit-office-template"].forEach((key) => window.localStorage.removeItem(key)); router.push("/login"); router.refresh(); }} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar view={view} onMenu={() => setMobileNav(true)} displayName={identity.displayName} onNavigate={setView} />
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
          ) : <DashboardView view={view} {...data} workspaceId={identity.workspaceId} workspaceRole={identity.workspaceRole} />}
        </div>
      </div>
      <FeatureDialog kind={activePanel} onClose={closePanel} tasks={data.tasks} moveTask={data.moveTask} addTask={data.addTask} huddle={huddle} workspaceId={identity.workspaceId} />
    </main>
  );
}

function Sidebar({ view, setView, mobileNav, onClose, workspaceName, workspaceId, workspaces, onSelectWorkspace, onExit }: { view: View; setView: (view: View) => void; mobileNav: boolean; onClose: () => void; workspaceName: string; workspaceId: string; workspaces: WorkspaceSummary[]; onSelectWorkspace: (workspace: WorkspaceSummary) => void; onExit: () => Promise<void> }) {
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  return <>
    {mobileNav && <button className="fixed inset-0 z-30 bg-black/35 lg:hidden" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#173f2b] p-3 text-[#f5f0e4] transition-transform lg:static lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c8f560] text-[#173f2b]"><Command size={20} strokeWidth={2.5} /></div><span className="text-lg font-bold tracking-tight">orbit</span></div>
        <button className="lg:hidden" onClick={onClose}><X size={20} /></button>
      </div>
      <button onClick={() => setWorkspaceMenu((value) => !value)} aria-expanded={workspaceMenu} className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.08] p-3 text-left">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff8a4c] text-sm font-bold text-[#311b13]">{initialsFor(workspaceName)}</div>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{workspaceName}</div><div className="text-xs text-white/55">{hasSupabaseConfig ? "Private workspace" : "Local demo"}</div></div><ChevronDown size={16} className="text-white/50" />
      </button>
      {workspaceMenu && <div className="mb-3 mt-1 rounded-2xl border border-white/10 bg-[#214d38] p-1.5 shadow-xl">{workspaces.map((workspace) => <button key={workspace.id} onClick={() => { onSelectWorkspace(workspace); setWorkspaceMenu(false); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${workspace.id === workspaceId ? "bg-[#c8f560] text-[#173f2b]" : "text-white/75 hover:bg-white/10"}`}><span className="min-w-0 flex-1 truncate font-semibold">{workspace.name}</span><span className="text-[10px] uppercase opacity-60">{workspace.role}</span></button>)}</div>}
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

function Topbar({ view, onMenu, displayName, onNavigate }: { view: View; onMenu: () => void; displayName: string; onNavigate: (view: View) => void }) {
  const title = nav.find((item) => item.id === view)?.label ?? "Office";
  const teammateCount = useOfficeStore((state) => Object.keys(state.remotePlayers).length);
  const availability = useOfficeStore((state) => state.avatarStatus);
  const setAvailability = useOfficeStore((state) => state.setAvatarStatus);
  const [query, setQuery] = useState(""); const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } if (event.key === "Escape") setSearchOpen(false); }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); }, []);
  const matches = nav.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-black/[.07] bg-[#fffdf7]/95 px-4 backdrop-blur-md md:px-5">
    <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-black/5 lg:hidden" onClick={onMenu}><Menu size={20} /></button>
    <div><h1 className="text-base font-bold tracking-tight">{title}</h1><p className="hidden text-xs text-[#68736b] sm:block">Friday, October 9 · {teammateCount ? `${teammateCount} teammate${teammateCount === 1 ? "" : "s"} nearby` : "Waiting for teammates"}</p></div>
    <div className="relative ml-auto hidden w-full max-w-xs md:block"><div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-[#68736b]"><Search size={16} /><input value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} className="w-full bg-transparent text-sm outline-none" placeholder="Jump to…" aria-label="Search workspace" /><kbd className="rounded bg-black/5 px-1.5 py-0.5 text-xs">⌘K</kbd></div>{searchOpen && <div className="absolute inset-x-0 top-12 overflow-hidden rounded-2xl border border-black/10 bg-[#fffdf7] p-1.5 shadow-2xl">{matches.map((item) => <button key={item.id} onClick={() => { onNavigate(item.id); setSearchOpen(false); setQuery(""); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5"><item.icon size={16} /><span>{item.label}</span></button>)}{matches.length === 0 && <div className="p-3 text-center text-xs text-[#68736b]">No workspace destination found.</div>}</div>}</div>
    <Button size="sm" onClick={() => useOfficeStore.getState().openPanel("ai_assistant")} className="hidden sm:flex items-center gap-1.5 bg-[#173f2b] text-[#c8f560] hover:bg-[#20573c] border-none shadow-sm"><Bot size={16} /> AI Copilot</Button>
    <Button variant="ghost" size="icon" aria-label="Help"><CircleHelp size={19} /></Button>
    <NotificationMenu />
    <label className="hidden items-center gap-2 rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-[#4d5a52] xl:flex"><span className={`h-2 w-2 rounded-full ${availability === "available" ? "bg-[#55ac74]" : availability === "focus" ? "bg-blue-500" : availability === "away" ? "bg-amber-500" : "bg-red-500"}`} /><select aria-label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value as Availability)} className="bg-transparent outline-none"><option value="available">Available</option><option value="focus">Focusing</option><option value="do_not_disturb">Do not disturb</option><option value="away">Away</option></select></label>
    <button className="grid h-9 w-9 place-items-center rounded-full bg-[#efad73] text-xs font-bold" aria-label={`${displayName} profile`}>{initialsFor(displayName)}</button>
  </header>;
}

function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WorkspaceNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const unread = items.filter((item) => !item.readAt).length;
  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next) { setLoading(true); try { setItems(await fetchNotifications()); } finally { setLoading(false); } }
  };
  const read = async (item: WorkspaceNotification) => { await markNotificationRead(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)); };
  return <div className="relative"><Button variant="ghost" size="icon" aria-label="Notifications" aria-expanded={open} className="relative" onClick={() => void toggle()}><Bell size={19} />{unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff8a4c]" />}</Button>{open && <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-black/10 bg-[#fffdf7] shadow-2xl"><div className="border-b border-black/[.07] p-4"><h3 className="text-sm font-bold">Notifications</h3><p className="mt-0.5 text-xs text-[#68736b]">{unread} unread</p></div>{loading ? <div className="grid place-items-center p-8"><Loader2 className="animate-spin" size={18} /></div> : <div className="max-h-80 overflow-auto">{items.map((item) => <button key={item.id} onClick={() => void read(item)} className={`block w-full border-b border-black/[.05] p-4 text-left last:border-0 ${item.readAt ? "opacity-60" : "bg-[#f4f8ed]"}`}><div className="text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-[#68736b]">{item.body}</div></button>)}{items.length === 0 && <div className="p-8 text-center text-sm text-[#68736b]">You’re all caught up.</div>}</div>}</div>}</div>;
}

function OfficeHud({ rightRail, onToggleRail, tasks, displayName }: { rightRail: boolean; onToggleRail: () => void; tasks: { status: string }[]; displayName: string }) {
  const remotePlayers = useOfficeStore((state) => state.remotePlayers);
  const connectionState = useOfficeStore((state) => state.connectionState);
  const transportLabel = useOfficeStore((state) => state.transportLabel);
  const cameraMode = useOfficeStore((state) => state.cameraMode);
  const toggleCameraMode = useOfficeStore((state) => state.toggleCameraMode);
  const lightingMode = useOfficeStore((state) => state.lightingMode);
  const cycleLightingMode = useOfficeStore((state) => state.cycleLightingMode);
  const lofiPlaying = useOfficeStore((state) => state.lofiPlaying);
  const toggleLofi = useOfficeStore((state) => state.toggleLofi);
  const isCaffeinated = useOfficeStore((state) => state.isCaffeinated);
  const isSitting = useOfficeStore((state) => state.isSitting);
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);
  const zoomLevel = useOfficeStore((state) => state.zoomLevel);
  const zoomIn = useOfficeStore((state) => state.zoomIn);
  const zoomOut = useOfficeStore((state) => state.zoomOut);
  const onlineCount = Object.keys(remotePlayers).length + 1;

  return <>
    <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-white/40 bg-[#fffdf7]/[.92] p-3.5 shadow-panel backdrop-blur-md sm:left-5 sm:top-5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className={`h-2.5 w-2.5 rounded-full ${connectionState === "connected" ? "bg-[#52aa72]" : connectionState === "offline" ? "bg-[#d46b52]" : "animate-pulse bg-[#e5a13e]"}`} />
          <span>Open workspace</span>
          {isCaffeinated && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
              <Coffee size={11} /> +30% Speed
            </span>
          )}
          {isSitting && (
            <button
              onClick={() => setIsSitting(false)}
              className="rounded-full bg-blue-100 border border-blue-300 text-blue-800 px-2 py-0.5 text-[10px] font-bold hover:bg-blue-200 transition"
              title="Click or press F / WASD to stand up"
            >
              🪑 Seated (Stand up)
            </button>
          )}
        </div>

        {/* Quick Office Controls Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Lofi Radio Button */}
          <button
            onClick={toggleLofi}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              lofiPlaying
                ? "bg-[#173f2b] text-[#c8f560] border-[#173f2b] shadow-xs"
                : "bg-white/90 text-[#3a443e] border-black/10 hover:bg-black/5"
            }`}
            title="Toggle Procedural Lofi Chill Chords"
          >
            <Radio size={13} className={lofiPlaying ? "text-[#c8f560] animate-pulse" : "text-[#68736b]"} />
            <span>{lofiPlaying ? "Lofi: On ♫" : "Lofi"}</span>
          </button>

          {/* Atmosphere Lighting Toggle */}
          <button
            onClick={cycleLightingMode}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#173f2b] shadow-xs transition hover:bg-black/5"
            title="Cycle Lighting Atmosphere: Day, Golden Sunset, Cyberpunk Night"
          >
            {lightingMode === "day" ? (
              <>
                <Sun size={13} className="text-amber-500" />
                <span>Day</span>
              </>
            ) : lightingMode === "sunset" ? (
              <>
                <Sunset size={13} className="text-orange-500" />
                <span>Sunset</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-blue-500" />
                <span>Night</span>
              </>
            )}
          </button>

          {/* Camera View Toggle */}
          <button
            onClick={toggleCameraMode}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#173f2b] shadow-xs transition hover:bg-black/5"
            title="Toggle between Full Office Top View and Follow View (Shortcut: V)"
          >
            {cameraMode === "top" ? (
              <>
                <Maximize2 size={13} className="text-[#327a56]" />
                <span>Top View</span>
              </>
            ) : (
              <>
                <User size={13} className="text-[#327a56]" />
                <span>Follow</span>
              </>
            )}
          </button>

          {/* Broad View Zoom Controls */}
          <div className="flex items-center rounded-lg border border-black/10 bg-white/90 shadow-xs">
            <button
              onClick={zoomOut}
              className="px-2 py-1 text-xs font-bold text-[#173f2b] hover:bg-black/5 transition rounded-l-lg"
              title="Broader View (Zoom Out)"
            >
              −
            </button>
            <span className="px-1 text-[10px] font-semibold text-[#68736b] select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="px-2 py-1 text-xs font-bold text-[#173f2b] hover:bg-black/5 transition rounded-r-lg"
              title="Closer View (Zoom In)"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-[#68736b]">Move with WASD or arrow keys · Click floor to walk · Press E to interact · F to sit/stand · V view · {transportLabel}</p>
    </div>
    <button onClick={onToggleRail} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-xl border border-white/50 bg-[#fffdf7]/[.9] shadow-lg backdrop-blur-md lg:hidden"><Users size={18} /></button>
    {rightRail && <aside className="absolute right-5 top-5 z-10 hidden w-64 rounded-[24px] border border-white/45 bg-[#fffdf7]/[.9] p-4 shadow-panel backdrop-blur-md lg:block">
      <div className="flex items-center justify-between"><h2 className="text-sm font-bold">In the office</h2><Badge className="bg-[#e5f3e7] text-[#276141]">{onlineCount} online</Badge></div>
      <div className="mt-4 flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center rounded-full bg-[#efad73] text-xs font-bold">{initialsFor(displayName)}<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#55ac74]" /></div><div><div className="text-sm font-semibold">{displayName}</div><div className="text-xs text-[#68736b]">Open workspace</div></div></div>
      {Object.values(remotePlayers).map((player) => <div key={player.id} className="mt-3 flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white" style={{ background: player.color }}>{player.name.slice(0, 2).toUpperCase()}<span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${player.status === "focus" ? "bg-blue-500" : player.status === "do_not_disturb" ? "bg-red-500" : player.status === "away" ? "bg-amber-500" : "bg-[#55ac74]"}`} /></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{player.name}</div><div className="text-xs capitalize text-[#68736b]">{(player.status || "available").replaceAll("_", " ")}</div></div></div>)}
      <div className="my-4 h-px bg-black/[.07]" />
      <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#68736b]">Today</span><span className="text-xs text-[#68736b]">{tasks.filter((task) => task.status !== "Done").length} open tasks</span></div>
      <div className="mt-3 rounded-2xl bg-[#173f2b] p-3 text-[#f5f0e4]"><div className="text-xs text-white/55">Next meeting · 3:30 PM</div><div className="mt-1 text-sm font-semibold">Weekly product pulse</div><button onClick={() => useOfficeStore.getState().openPanel("meeting")} className="mt-3 w-full rounded-xl bg-[#c8f560] py-2 text-xs font-bold text-[#173f2b]">View meeting</button></div>
    </aside>}
  </>;
}

function DashboardView({ view, tasks, moveTask, addTask, workspaceId, workspaceRole }: { view: Exclude<View, "office">; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"]; workspaceId: string; workspaceRole: WorkspaceSummary["role"] }) {
  if (view === "projects") return <div className="h-full overflow-auto"><ProjectsView workspaceId={workspaceId} /></div>;
  if (view === "tasks") return <div className="h-full overflow-auto"><KanbanView workspaceId={workspaceId} /></div>;
  if (view === "goals") return <div className="h-full overflow-auto"><GoalsView workspaceId={workspaceId} /></div>;
  if (view === "analytics") return <div className="h-full overflow-auto"><AnalyticsView workspaceId={workspaceId} /></div>;
  if (view === "meetings") return <div className="h-full overflow-auto"><MeetingsView workspaceId={workspaceId} /></div>;
  if (view === "files") return <div className="h-full overflow-auto"><DocumentsView workspaceId={workspaceId} /></div>;
  if (view === "whiteboard") return <div className="h-full overflow-auto"><div className="mx-auto max-w-6xl space-y-5 p-4 md:p-7"><div><div className="text-xs font-bold tracking-[.18em] text-[#4b7a5e]">LIVE CANVAS</div><h2 className="mt-2 text-3xl font-bold">Whiteboard</h2><p className="mt-1 text-sm text-[#68736b]">Sketch, arrange ideas, and merge teammates’ changes in real time.</p></div><WhiteboardPanel workspaceId={workspaceId} /></div></div>;
  if (view === "activity") return <div className="h-full overflow-auto"><ActivityView workspaceId={workspaceId} /></div>;
  if (view === "design") return <div className="h-full overflow-auto"><OfficeDesignView workspaceId={workspaceId} canEdit={workspaceRole === "owner" || workspaceRole === "admin"} /></div>;
  if (view === "billing") return <div className="h-full overflow-auto"><BillingView workspaceId={workspaceId} canManage={workspaceRole === "owner" || workspaceRole === "admin"} /></div>;
  if (view === "integrations") return <div className="h-full overflow-auto"><IntegrationsView workspaceId={workspaceId} canManage={workspaceRole === "owner" || workspaceRole === "admin"} /></div>;
  if (view === "team") return <div className="h-full overflow-auto"><TeamView workspaceId={workspaceId} /></div>;
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

function FeatureDialog({ kind, onClose, tasks, moveTask, addTask, huddle, workspaceId }: { kind: ReturnType<typeof useOfficeStore.getState>["activePanel"]; onClose: () => void; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"]; huddle: HuddleController; workspaceId: string }) {
  if (!kind) return null;
  if (kind === "projects") return <Dialog open title="Project board" onClose={onClose}><KanbanView workspaceId="northstar-demo" /></Dialog>;
  if (kind === "whiteboard") return <Dialog open title="Spatial Whiteboard" onClose={onClose}><WhiteboardPanel workspaceId={workspaceId} /></Dialog>;
  if (kind === "focus") return <Dialog open title="Focus pod" onClose={onClose}><FocusPanel /></Dialog>;
  if (kind === "ai_assistant") return <Dialog open title="AI Startup Copilot" onClose={onClose}><AIAssistantPanel tasks={tasks} addTask={addTask} /></Dialog>;
  return <Dialog open title="Weekly product pulse" onClose={onClose}><MeetingPanel huddle={huddle} /></Dialog>;
}

function MeetingPanel({ huddle }: { huddle: HuddleController }) {
  const participants = Object.values(huddle.participants);
  const local = participants.find((participant) => participant.isLocal);
  const waiting = huddle.status === "requesting_permission" || huddle.status === "joining";
  return <div>
    <div className="rounded-2xl bg-[#173f2b] p-5 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><Badge className="bg-[#c8f560] text-[#173f2b]">TODAY · 3:30 PM</Badge><p className="mt-4 max-w-md text-sm leading-6 text-white/70">Align on launch blockers, review beta readiness, and leave with one owner per open decision.</p></div><div className="flex items-center gap-2 text-xs text-white/60"><Wifi size={15} /> Peer-to-peer huddle</div></div></div>
    {huddle.status === "idle" || huddle.status === "error" ? <div className="mt-5 rounded-2xl border border-black/[.08] bg-white p-5"><h3 className="font-bold">Choose how to join</h3><p className="mt-2 text-sm leading-6 text-[#68736b]">Your browser will ask before Orbit accesses a microphone or camera. Nothing starts automatically.</p>{huddle.error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{huddle.error}</p>}<div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => void huddle.join(true)}><Video size={17} /> Join with camera</Button><Button variant="outline" onClick={() => void huddle.join(false)}><Mic size={17} /> Audio only</Button></div></div> : null}
    {waiting && <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#eef4ea] p-5 text-sm text-[#315e45]"><Loader2 className="animate-spin" size={18} /> Waiting for media permission…</div>}
    {huddle.status === "connected" && <><div className="mt-5 grid gap-3 sm:grid-cols-2">{participants.map((participant) => <VideoTile key={participant.id} participant={participant} />)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><Button variant={local?.microphoneEnabled ? "solid" : "outline"} size="icon" onClick={huddle.toggleMicrophone} aria-label={local?.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}>{local?.microphoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}</Button><Button variant={local?.cameraEnabled ? "solid" : "outline"} size="icon" onClick={huddle.toggleCamera} aria-label={local?.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{local?.cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}</Button><Button variant={local?.screenSharing ? "solid" : "outline"} onClick={() => void huddle.toggleScreenShare()} aria-label={local?.screenSharing ? "Stop sharing screen" : "Share screen"}><MonitorUp size={17} /> {local?.screenSharing ? "Stop sharing" : "Share screen"}</Button><Button className="ml-auto bg-[#b64b3e] hover:bg-[#9f3f34]" onClick={() => void huddle.leave()}><PhoneOff size={17} /> Leave huddle</Button></div></>}
  </div>;
}

function VideoTile({ participant }: { participant: CallParticipant }) {
  const video = useRef<HTMLVideoElement>(null);
  const speaking = useSpeakingIndicator(participant.stream, participant.microphoneEnabled);
  useEffect(() => { if (video.current) video.current.srcObject = participant.stream; }, [participant.stream]);
  return <article className={`relative aspect-video overflow-hidden rounded-2xl bg-[#1d3027] text-white ring-2 transition ${speaking ? "ring-[#c8f560]" : "ring-transparent"}`}><video ref={video} autoPlay playsInline muted={participant.isLocal} className={`h-full w-full object-cover ${participant.isLocal && !participant.screenSharing ? "-scale-x-100" : ""}`} />{!participant.cameraEnabled && !participant.screenSharing && <div className="absolute inset-0 grid place-items-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-[#c8f560] text-xl font-bold text-[#173f2b]">{participant.name.slice(0, 2).toUpperCase()}</div></div>}{participant.screenSharing && <span className="absolute left-3 top-3 rounded-full bg-[#c8f560] px-2.5 py-1 text-[10px] font-bold text-[#173f2b]">PRESENTING</span>}<div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 pt-8"><span className="text-sm font-semibold">{participant.name}</span><div className="flex items-center gap-1.5">{speaking && <span className="text-[10px] font-bold text-[#c8f560]">Speaking</span>}{participant.connectionState === "connecting" && <Loader2 className="animate-spin" size={14} />}{participant.microphoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}</div></div></article>;
}

function useSpeakingIndicator(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (!stream || !enabled || stream.getAudioTracks().length === 0) { setSpeaking(false); return; }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    const values = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let last = 0;
    const sample = (time: number) => {
      if (time - last > 120) {
        analyser.getByteFrequencyData(values);
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        setSpeaking(average > 18);
        last = time;
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => { cancelAnimationFrame(frame); source.disconnect(); void context.close(); };
  }, [enabled, stream]);
  return speaking;
}

function FocusPanel() { const [active, setActive] = useState(false); return <div className="text-center"><div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-[10px] border-[#e6eadf] text-3xl font-bold">25:00</div><h3 className="mt-5 text-lg font-bold">Protect one block of attention</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68736b]">Your office presence will show as focusing while this session is active.</p><Button className="mt-5" onClick={() => setActive((value) => !value)}>{active ? "End session" : "Start focus session"}</Button></div>; }
