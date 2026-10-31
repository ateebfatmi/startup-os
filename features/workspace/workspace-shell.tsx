"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, AudioLines, BarChart3, Bot, Bell, CalendarDays, CheckSquare2, ChevronDown, CircleHelp, Coffee, Command, CreditCard, DoorOpen, Files, FolderKanban, Gauge, Headphones, LayoutGrid, Loader2, LogOut, Map, MapPin, Maximize2, Menu, Mic, MicOff, Minimize2, MonitorUp, Moon, Music, Palette, PanelLeftClose, PanelLeftOpen, PenTool, PhoneOff, Plug, Plus, Radio, Search, Sparkles, Sun, Sunset, Target, User, Users, Video, VideoOff, VolumeX, Wifi, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { SpatialOverlays } from "@/features/virtual-office/spatial-overlays";
import { AITeammateDialog } from "@/features/virtual-office/ai-teammate-dialog";
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
import { useProximityAudio, type ProximityAudioController } from "@/features/communication/use-proximity-audio";
import { OFFICE_ROOMS } from "@/features/virtual-office/office-data";
import { OFFICE_BOUNDS } from "@/features/virtual-office/collision";

const nav = [
  { id: "office", label: "Office", icon: DoorOpen, group: "Workspace" },
  { id: "overview", label: "Overview", icon: LayoutGrid, group: "Workspace" },
  { id: "projects", label: "Projects", icon: FolderKanban, group: "Plan & ship" },
  { id: "tasks", label: "My tasks", icon: CheckSquare2, group: "Plan & ship" },
  { id: "goals", label: "Goals", icon: Target, group: "Plan & ship" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Plan & ship" },
  { id: "meetings", label: "Meetings", icon: CalendarDays, group: "Collaborate" },
  { id: "files", label: "Files", icon: Files, group: "Collaborate" },
  { id: "whiteboard", label: "Whiteboard", icon: PenTool, group: "Collaborate" },
  { id: "activity", label: "Activity", icon: Activity, group: "Collaborate" },
  { id: "design", label: "Office design", icon: Palette, group: "Manage" },
  { id: "billing", label: "Billing", icon: CreditCard, group: "Manage" },
  { id: "integrations", label: "Integrations", icon: Plug, group: "Manage" },
  { id: "team", label: "Team", icon: Users, group: "Manage" },
] as const;

const navGroups = ["Workspace", "Plan & ship", "Collaborate", "Manage"] as const;

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
        supabase.from("profiles").select("display_name, avatar_config").eq("id", user.id).maybeSingle(),
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
      const avatarConfig = profile?.avatar_config as { color?: unknown } | null;
      if (typeof avatarConfig?.color === "string" && /^#[0-9a-f]{6}$/i.test(avatarConfig.color)) {
        window.localStorage.setItem("orbit-avatar-color", avatarConfig.color);
        const player = useOfficeStore.getState().player;
        useOfficeStore.getState().setPlayerIdentity({ id: player.id, name: nextIdentity.displayName, color: avatarConfig.color });
      }
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
  const proximity = useProximityAudio(huddle);
  const [view, setView] = useState<View>("office");
  const [mobileNav, setMobileNav] = useState(false);
  const [rightRail, setRightRail] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullOfficeView, setFullOfficeView] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullOfficeView) {
        setFullOfficeView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullOfficeView]);

  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const activePanel = useOfficeStore((state) => state.activePanel);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const closePanel = useOfficeStore((state) => state.closePanel);
  const data = useWorkspaceData();
  const localParticipant = Object.values(huddle.participants).find((participant) => participant.isLocal);
  const inCall = huddle.status === "connected";

  return (
    <main className="app-surface flex h-[100dvh] overflow-hidden">
      {!fullOfficeView && (
        <Sidebar
          view={view}
          setView={setView}
          mobileNav={mobileNav}
          onClose={() => setMobileNav(false)}
          taskCount={data.tasks.filter((task) => task.status !== "Done").length}
          workspaceName={identity.workspaceName}
          workspaceId={identity.workspaceId}
          workspaces={workspaces}
          onSelectWorkspace={selectWorkspace}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onExit={async () => {
            if (hasSupabaseConfig) await createSupabaseBrowserClient().auth.signOut();
            ["orbit-display-name", "orbit-workspace-name", "orbit-workspace-id", "orbit-workspace-type", "orbit-office-template"].forEach((key) => window.localStorage.removeItem(key));
            router.push("/login");
            router.refresh();
          }}
        />
      )}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {!fullOfficeView && (
          <Topbar
            view={view}
            onMenu={() => setMobileNav(true)}
            onHelp={() => setHelpOpen(true)}
            displayName={identity.displayName}
            onNavigate={setView}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          />
        )}
        <div className="relative isolate min-h-0 flex-1">
          {view === "office" ? (
            <>
              <div className="absolute inset-0 z-0"><OfficeCanvas /></div>
              <OfficeHud
                rightRail={rightRail}
                onToggleRail={() => setRightRail((value) => !value)}
                tasks={data.tasks}
                displayName={identity.displayName}
                isFullOffice={fullOfficeView}
                onToggleFullOffice={() => setFullOfficeView((v) => !v)}
              />
              <SpatialOverlays displayName={identity.displayName} />
              <AITeammateDialog />
              <ProximityAudioControl controller={proximity} />
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/35 bg-[#fffdf7]/90 p-2 shadow-panel backdrop-blur-md">
                <Button variant={localParticipant?.microphoneEnabled ? "solid" : "outline"} size="icon" onClick={() => inCall ? huddle.toggleMicrophone() : openPanel("meeting")} aria-label={localParticipant?.microphoneEnabled ? "Mute microphone" : "Unmute microphone"}>{localParticipant?.microphoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}</Button>
                <Button variant={localParticipant?.cameraEnabled ? "solid" : "outline"} size="icon" onClick={() => inCall ? huddle.toggleCamera() : openPanel("meeting")} aria-label={localParticipant?.cameraEnabled ? "Turn camera off" : "Turn camera on"}>{localParticipant?.cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}</Button>
                <div className="mx-1 h-6 w-px bg-black/10" />
                <Button variant="outline" size="sm" onClick={() => openPanel("meeting")}><Headphones size={17} /> {inCall ? `${Object.keys(huddle.participants).length} in huddle` : "Start huddle"}</Button>
              </div>
            </>
          ) : <DashboardView view={view} {...data} workspaceId={identity.workspaceId} workspaceRole={identity.workspaceRole} displayName={identity.displayName} workspaceName={identity.workspaceName} />}
        </div>
      </div>
      <FeatureDialog kind={activePanel} onClose={closePanel} tasks={data.tasks} moveTask={data.moveTask} addTask={data.addTask} huddle={huddle} workspaceId={identity.workspaceId} workspaceName={identity.workspaceName} />
      <QuickStartDialog open={helpOpen} onClose={() => setHelpOpen(false)} onNavigate={(destination) => { setView(destination); setHelpOpen(false); }} />
    </main>
  );
}

function ProximityAudioControl({ controller }: { controller: ProximityAudioController }) {
  const busy = controller.status === "requesting_permission" || controller.status === "joining";
  return <div className="absolute bottom-24 left-4 z-20 hidden max-w-64 rounded-2xl border border-white/45 bg-[#fffdf7]/90 p-3 shadow-xl backdrop-blur md:block"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 place-items-center rounded-xl ${controller.active ? "bg-[#c8f560] text-[#173f2b]" : "bg-black/5 text-[#68736b]"}`}>{controller.active ? <AudioLines size={17} /> : <VolumeX size={17} />}</span><div className="min-w-0 flex-1"><div className="text-xs font-bold">{controller.active ? "Proximity audio active" : controller.enabled ? "Proximity audio ready" : "Proximity audio off"}</div><div className="truncate text-[10px] text-[#68736b]">{controller.group ? `${controller.group.names.join(", ")} nearby` : "Move near a teammate to connect"}</div></div></div><button aria-label={controller.enabled ? "Disable proximity audio" : "Enable proximity audio"} onClick={controller.toggle} className={`mt-2 w-full rounded-xl px-3 py-2 text-xs font-bold ${controller.enabled ? "bg-[#173f2b] text-white" : "bg-[#c8f560] text-[#173f2b]"}`}>{busy ? "Requesting microphone…" : controller.enabled ? "Disable" : "Enable with microphone"}</button></div>;
}

function Sidebar({ view, setView, mobileNav, onClose, taskCount, workspaceName, workspaceId, workspaces, onSelectWorkspace, onExit, isCollapsed, onToggleCollapse }: { view: View; setView: (view: View) => void; mobileNav: boolean; onClose: () => void; taskCount: number; workspaceName: string; workspaceId: string; workspaces: WorkspaceSummary[]; onSelectWorkspace: (workspace: WorkspaceSummary) => void; onExit: () => Promise<void>; isCollapsed: boolean; onToggleCollapse: () => void }) {
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  return <>
    {mobileNav && <button className="fixed inset-0 z-30 bg-black/35 lg:hidden" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[.06] bg-[linear-gradient(180deg,#173f2b_0%,#102f21_100%)] p-2.5 text-[#f5f0e4] shadow-2xl transition-all lg:static lg:translate-x-0 lg:shadow-none ${mobileNav ? "translate-x-0 w-[17rem]" : "-translate-x-full lg:translate-x-0"} ${isCollapsed ? "lg:w-[4.5rem]" : "lg:w-[17rem]"}`}>
      <div className={`flex h-14 items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-2"}`}>
        <button onClick={onToggleCollapse} title={isCollapsed ? "Expand sidebar (shortcut)" : "Orbit Workspace OS"} className="flex items-center gap-2.5 rounded-xl hover:bg-white/10 p-1.5 transition">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#c8f560] text-[#173f2b] shadow-[0_8px_24px_rgba(200,245,96,.18)]">
            <Command size={19} strokeWidth={2.7} />
          </div>
          {!isCollapsed && <div><div className="text-[15px] font-extrabold leading-none tracking-[-.02em]">PZ Orbit</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">Workspace OS</div></div>}
        </button>
        {!isCollapsed && (
          <button className="hidden lg:grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white" onClick={onToggleCollapse} title="Collapse sidebar (more office area)">
            <PanelLeftClose size={16} />
          </button>
        )}
        <button className="lg:hidden" onClick={onClose}><X size={20} /></button>
      </div>

      <button onClick={() => setWorkspaceMenu((value) => !value)} aria-expanded={workspaceMenu} title={workspaceName} className={`mt-3 flex items-center rounded-2xl border border-white/10 bg-white/[.07] text-left shadow-sm transition hover:border-white/15 hover:bg-white/[.1] ${isCollapsed ? "justify-center p-2" : "gap-3 p-3"}`}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ff8a4c] text-sm font-bold text-[#311b13]">{initialsFor(workspaceName)}</div>
        {!isCollapsed && <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{workspaceName}</div><div className="text-xs text-white/55">{hasSupabaseConfig ? "Private workspace" : "Local demo"}</div></div>}
        {!isCollapsed && <ChevronDown size={16} className="text-white/50" />}
      </button>
      {workspaceMenu && <div className="mb-3 mt-1 rounded-2xl border border-white/10 bg-[#214d38] p-1.5 shadow-xl">{workspaces.map((workspace) => <button key={workspace.id} onClick={() => { onSelectWorkspace(workspace); setWorkspaceMenu(false); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${workspace.id === workspaceId ? "bg-[#c8f560] text-[#173f2b]" : "text-white/75 hover:bg-white/10"}`}><span className="min-w-0 flex-1 truncate font-semibold">{workspace.name}</span><span className="text-[10px] uppercase opacity-60">{workspace.role}</span></button>)}</div>}

      <nav className="scrollbar-none mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5" aria-label="Workspace">
        {navGroups.map((group) => <div key={group} className="mb-3">
          {!isCollapsed && <div className="mb-1 px-3 text-[9px] font-extrabold uppercase tracking-[.19em] text-white/30">{group}</div>}
          {nav.filter((item) => item.group === group).map((item) => <button key={item.id} aria-current={view === item.id ? "page" : undefined} title={item.label} onClick={() => { setView(item.id); onClose(); }} className={`group relative flex h-10 w-full items-center rounded-xl text-sm font-semibold transition-all ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${view === item.id ? "bg-[#c8f560] text-[#173f2b] shadow-[0_8px_22px_rgba(0,0,0,.12)]" : "text-white/62 hover:bg-white/[.07] hover:text-white"}`}><item.icon size={17} strokeWidth={view === item.id ? 2.4 : 2} className="shrink-0" />{!isCollapsed && <span>{item.label}</span>}{!isCollapsed && item.id === "tasks" && taskCount > 0 && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${view === item.id ? "bg-[#173f2b]/10" : "bg-white/10"}`}>{taskCount}</span>}{isCollapsed && item.id === "tasks" && taskCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#c8f560]" />}</button>)}
        </div>)}
      </nav>

      {!isCollapsed && (
        <div className="mt-auto rounded-2xl border border-white/[.07] bg-white/[.055] p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-[#c8f560]" /> {hasSupabaseConfig ? "Private workspace" : "Demo workspace"}</div>
          <p className="text-xs leading-5 text-white/60">{hasSupabaseConfig ? "Your session and membership are protected by Supabase Auth and RLS." : "Connect Supabase to replace local sample data with your team workspace."}</p>
        </div>
      )}
      <button onClick={() => void onExit()} title={hasSupabaseConfig ? "Sign out" : "Exit demo"} className={`mt-2 flex h-11 items-center rounded-xl text-sm text-white/65 hover:bg-white/[.07] ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}><LogOut size={18} />{!isCollapsed && <span>{hasSupabaseConfig ? "Sign out" : "Exit demo"}</span>}</button>
    </aside>
  </>;
}

function Topbar({ view, onMenu, onHelp, displayName, onNavigate, isSidebarCollapsed, onToggleSidebar }: { view: View; onMenu: () => void; onHelp: () => void; displayName: string; onNavigate: (view: View) => void; isSidebarCollapsed: boolean; onToggleSidebar: () => void }) {
  const title = nav.find((item) => item.id === view)?.label ?? "Office";
  const teammateCount = useOfficeStore((state) => Object.keys(state.remotePlayers).length);
  const availability = useOfficeStore((state) => state.avatarStatus);
  const setAvailability = useOfficeStore((state) => state.setAvatarStatus);
  const [query, setQuery] = useState(""); const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } if (event.key === "Escape") setSearchOpen(false); }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); }, []);
  const matches = nav.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return <header className="relative z-20 flex h-[4.5rem] shrink-0 items-center gap-3 border-b border-black/[.07] bg-[#fffdf7]/90 px-4 shadow-[0_1px_0_rgba(255,255,255,.75)] backdrop-blur-xl md:px-6">
    <button aria-label="Open navigation" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-black/5 lg:hidden" onClick={onMenu}><Menu size={20} /></button>
    <Button variant="ghost" size="icon" className="hidden lg:grid h-9 w-9 place-items-center rounded-xl text-[#4d5a52] hover:bg-black/5" onClick={onToggleSidebar} title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar (more office area)"}>{isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</Button>
    <div className="min-w-0"><h1 className="truncate text-base font-extrabold tracking-[-.025em]">{title}</h1><p className="hidden truncate text-[11px] font-medium text-[#7a857d] sm:block">{today} <span className="px-1 text-black/20">•</span> {teammateCount ? `${teammateCount} teammate${teammateCount === 1 ? "" : "s"} nearby` : "Ready when your team is"}</p></div>
    <button onClick={() => setSearchOpen(true)} aria-label="Search workspace" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[.08] bg-white/80 text-[#68736b] shadow-sm transition hover:border-black/15 hover:bg-white md:w-full md:max-w-xs md:justify-start md:gap-2 md:px-3"><Search size={16} /><span className="hidden flex-1 text-left text-sm font-medium md:block">Search or jump to…</span><kbd className="hidden rounded-md border border-black/[.06] bg-black/[.035] px-1.5 py-0.5 text-[10px] font-semibold md:block">⌘ K</kbd></button>
    <Button size="sm" onClick={() => useOfficeStore.getState().openPanel("ai_assistant")} className="hidden sm:flex items-center gap-1.5 bg-[#173f2b] text-[#c8f560] hover:bg-[#20573c] border-none shadow-sm"><Bot size={16} /> AI Copilot</Button>
    <Button variant="ghost" size="icon" aria-label="Help and keyboard shortcuts" onClick={onHelp}><CircleHelp size={19} /></Button>
    <NotificationMenu />
    <label className="hidden items-center gap-2 rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-[#4d5a52] xl:flex"><span className={`h-2 w-2 rounded-full ${availability === "available" ? "bg-[#55ac74]" : availability === "focus" ? "bg-blue-500" : availability === "away" ? "bg-amber-500" : "bg-red-500"}`} /><select aria-label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value as Availability)} className="bg-transparent outline-none"><option value="available">Available</option><option value="focus">Focusing</option><option value="do_not_disturb">Do not disturb</option><option value="away">Away</option></select></label>
    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#efad73] text-xs font-bold" aria-label={`${displayName} profile`}>{initialsFor(displayName)}</button>
    {searchOpen && createPortal(<div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#102018]/45 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search workspace" onMouseDown={() => setSearchOpen(false)}><section className="w-full max-w-lg overflow-hidden rounded-[24px] border border-white/60 bg-[#fffdf7] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b border-black/[.07] px-4"><Search size={19} className="text-[#4b7a5e]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none" placeholder="Where do you want to go?" aria-label="Search destinations" /><button className="rounded-lg bg-black/5 px-2 py-1 text-xs text-[#68736b]" onClick={() => setSearchOpen(false)}>Esc</button></div><div className="max-h-[55vh] overflow-auto p-2"><div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#7a857d]">Destinations</div>{matches.map((item) => <button key={item.id} onClick={() => { onNavigate(item.id); setSearchOpen(false); setQuery(""); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-[#edf3e7]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-black/[.04] text-[#326447] group-hover:bg-white"><item.icon size={17} /></span><span className="flex-1 font-semibold">{item.label}</span><span className="text-xs text-[#8a938d]">{item.group}</span></button>)}{matches.length === 0 && <div className="p-8 text-center"><Search className="mx-auto text-[#a0aaa3]" size={24} /><div className="mt-3 text-sm font-semibold">No destination found</div><div className="mt-1 text-xs text-[#68736b]">Try projects, tasks, meetings, or team.</div></div>}</div></section></div>, document.body)}
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

function OfficeHud({ rightRail, onToggleRail, tasks, displayName, isFullOffice, onToggleFullOffice }: { rightRail: boolean; onToggleRail: () => void; tasks: { status: string }[]; displayName: string; isFullOffice?: boolean; onToggleFullOffice?: () => void }) {
  const player = useOfficeStore((state) => state.player);
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
  const qualityMode = useOfficeStore((state) => state.qualityMode);
  const setQualityMode = useOfficeStore((state) => state.setQualityMode);
  const measuredFps = useOfficeStore((state) => state.measuredFps);
  const onlineCount = Object.keys(remotePlayers).length + 1;

  return <>
    <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-4.5rem)] rounded-2xl border border-white/50 bg-[#fffdf7]/[.94] p-2.5 shadow-panel backdrop-blur-md sm:left-5 sm:top-5 sm:max-w-[calc(100%-6rem)] lg:max-w-[min(760px,calc(100%-20rem))]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className={`h-2.5 w-2.5 rounded-full ${connectionState === "connected" ? "bg-[#52aa72]" : connectionState === "offline" ? "bg-[#d46b52]" : "animate-pulse bg-[#e5a13e]"}`} />
          <span className="whitespace-nowrap">{connectionState === "connected" ? `${onlineCount} online` : connectionState === "offline" ? "Offline workspace" : "Connecting…"}</span>
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
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {/* Full Office Area Screen Toggle */}
          {onToggleFullOffice && (
            <button
              onClick={onToggleFullOffice}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                isFullOffice
                  ? "bg-[#173f2b] text-[#c8f560] border-[#173f2b] shadow-xs"
                  : "bg-white/90 text-[#3a443e] border-black/10 hover:bg-black/5"
              }`}
              title={isFullOffice ? "Exit full screen office (restore sidebar & topbar)" : "Maximize office area (Full Screen)"}
            >
              {isFullOffice ? <Minimize2 size={13} className="text-[#c8f560]" /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{isFullOffice ? "Exit Full" : "Full Office"}</span>
            </button>
          )}

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
            <span className="hidden sm:inline">{lofiPlaying ? "Lofi: On ♫" : "Lofi"}</span>
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
                <span className="hidden sm:inline">Day</span>
              </>
            ) : lightingMode === "sunset" ? (
              <>
                <Sunset size={13} className="text-orange-500" />
                <span className="hidden sm:inline">Sunset</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-blue-500" />
                <span className="hidden sm:inline">Night</span>
              </>
            )}
          </button>

          <button onClick={() => setQualityMode(qualityMode === "high" ? "reduced" : "high")} aria-label="Toggle rendering quality" className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#173f2b] shadow-xs transition hover:bg-black/5" title="Toggle high and reduced rendering modes"><Gauge size={13} className={measuredFps && measuredFps < 45 ? "text-amber-600" : "text-emerald-600"} /><span className="hidden sm:inline">{qualityMode === "high" ? "High" : "Reduced"} · </span><span>{measuredFps ? Math.round(measuredFps) : "—"} FPS</span></button>

          {/* Camera View Mode Segmented Control */}
          <div className="flex items-center rounded-lg border border-black/10 bg-white/90 p-0.5 shadow-xs">
            <button
              onClick={() => useOfficeStore.getState().setCameraMode("top")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                cameraMode === "top"
                  ? "bg-[#173f2b] text-[#c8f560] shadow-xs"
                  : "text-[#68736b] hover:text-[#173f2b] hover:bg-black/5"
              }`}
              title="Full Office Overview (Shortcut: V)"
            >
              <Maximize2 size={12} />
              <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => useOfficeStore.getState().setCameraMode("follow")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                cameraMode === "follow"
                  ? "bg-[#173f2b] text-[#c8f560] shadow-xs"
                  : "text-[#68736b] hover:text-[#173f2b] hover:bg-black/5"
              }`}
              title="Follow My Avatar (Shortcut: V)"
            >
              <User size={12} />
              <span className="hidden sm:inline">Follow Avatar</span>
            </button>
          </div>

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
      <p className="mt-1.5 hidden text-xs text-[#68736b] sm:block">Move with WASD or arrow keys · Click floor to walk · Press E to interact · F to sit/stand · V view · {transportLabel}</p>
    </div>
    <OfficeMinimap />
    {!rightRail && <button aria-label="Open people panel" onClick={onToggleRail} className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-xl border border-white/50 bg-[#fffdf7]/[.94] shadow-lg backdrop-blur-md sm:right-5 sm:top-5"><Users size={18} /></button>}
    {rightRail && <aside className="absolute right-3 top-16 z-30 w-[min(18rem,calc(100%-1.5rem))] rounded-[24px] border border-white/55 bg-[#fffdf7]/[.96] p-4 shadow-2xl backdrop-blur-md sm:right-5 lg:top-5 lg:z-10 lg:w-64 lg:shadow-panel">
      <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-bold">In the office</h2><p className="mt-0.5 text-[10px] text-[#68736b]">See who is available now</p></div><div className="flex items-center gap-1"><Badge className="bg-[#e5f3e7] text-[#276141]">{onlineCount} online</Badge><button aria-label="Close people panel" onClick={onToggleRail} className="grid h-8 w-8 place-items-center rounded-lg text-[#68736b] hover:bg-black/5"><X size={15} /></button></div></div>
      <div className="mt-4 flex items-center gap-3"><div className="relative grid h-10 w-10 place-items-center rounded-full bg-[#efad73] text-xs font-bold">{initialsFor(displayName)}<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#55ac74]" /></div><div><div className="text-sm font-semibold">{displayName}</div><div className="text-xs text-[#68736b]">{OFFICE_ROOMS.find((room) => room.id === player.roomId)?.shortName ?? "Open workspace"}</div></div></div>
      {Object.values(remotePlayers).map((remote) => <button key={remote.id} onClick={() => { useOfficeStore.getState().setClickTarget({ x: remote.x, z: remote.z }); useOfficeStore.getState().setCameraMode("top"); }} className="mt-2 flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-black/[.04]" title={`Walk to ${remote.name}`}><div className="relative grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-white" style={{ background: remote.color }}>{remote.name.slice(0, 2).toUpperCase()}<span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${remote.status === "focus" ? "bg-blue-500" : remote.status === "do_not_disturb" ? "bg-red-500" : remote.status === "away" ? "bg-amber-500" : "bg-[#55ac74]"}`} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{remote.name}</div><div className="flex min-w-0 items-center gap-1 truncate text-xs text-[#68736b]"><span className="truncate">{OFFICE_ROOMS.find((room) => room.id === remote.roomId)?.shortName ?? "Open workspace"}</span><span aria-hidden="true">·</span><span className="shrink-0 capitalize">{(remote.status || "available").replaceAll("_", " ")}</span></div></div><MapPin size={14} className="text-[#4b7a5e]" /></button>)}
      <div className="my-4 h-px bg-black/[.07]" />
      <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#68736b]">Today</span><span className="text-xs text-[#68736b]">{tasks.filter((task) => task.status !== "Done").length} open tasks</span></div>
      <div className="mt-3 rounded-2xl bg-[#173f2b] p-3 text-[#f5f0e4]"><div className="text-xs text-white/55">Next meeting · 3:30 PM</div><div className="mt-1 text-sm font-semibold">Weekly product pulse</div><button onClick={() => useOfficeStore.getState().openPanel("meeting")} className="mt-3 w-full rounded-xl bg-[#c8f560] py-2 text-xs font-bold text-[#173f2b]">View meeting</button></div>
    </aside>}
  </>;
}

function OfficeMinimap() {
  const player = useOfficeStore((state) => state.player);
  const remotePlayers = useOfficeStore((state) => state.remotePlayers);
  const [expanded, setExpanded] = useState(false);
  const totalW = OFFICE_BOUNDS.maxX - OFFICE_BOUNDS.minX;
  const totalH = OFFICE_BOUNDS.maxZ - OFFICE_BOUNDS.minZ;
  const mapX = (x: number) => `${((x - OFFICE_BOUNDS.minX) / totalW) * 100}%`;
  const mapY = (z: number) => `${((z - OFFICE_BOUNDS.minZ) / totalH) * 100}%`;
  const jump = (room: (typeof OFFICE_ROOMS)[number]) => {
    useOfficeStore.getState().setClickTarget(room.destination);
    useOfficeStore.getState().setCameraMode("top");
  };
  return <section className={`absolute bottom-24 right-3 z-20 overflow-hidden rounded-2xl border border-white/55 bg-[#fffdf7]/95 shadow-xl backdrop-blur-md transition-all sm:right-5 ${expanded ? "w-64 p-3" : "w-12 p-1.5"}`} aria-label="Office map">
    <button onClick={() => setExpanded((value) => !value)} className={`flex h-9 items-center rounded-xl text-[#173f2b] hover:bg-black/5 ${expanded ? "w-full gap-2 px-2" : "w-9 justify-center"}`} aria-label={expanded ? "Collapse office map" : "Expand office map"} aria-expanded={expanded}><Map size={17} /><span className={`${expanded ? "block" : "hidden"} text-xs font-bold`}>Office map</span><span className={`${expanded ? "ml-auto block" : "hidden"} text-[10px] text-[#68736b]`}>{OFFICE_ROOMS.find((room) => room.id === player.roomId)?.shortName ?? "Explore"}</span></button>
    {expanded && <><div className="relative mt-2 aspect-[1.2] overflow-hidden rounded-xl border border-black/10 bg-[#e8e2d6]">
      {OFFICE_ROOMS.map((room) => {
        const left = ((room.bounds.minX - OFFICE_BOUNDS.minX) / totalW) * 100;
        const top = ((room.bounds.minZ - OFFICE_BOUNDS.minZ) / totalH) * 100;
        const width = ((room.bounds.maxX - room.bounds.minX) / totalW) * 100;
        const height = ((room.bounds.maxZ - room.bounds.minZ) / totalH) * 100;
        const count = Object.values(remotePlayers).filter((remote) => remote.roomId === room.id).length + (player.roomId === room.id ? 1 : 0);
        return <button key={room.id} onClick={() => jump(room)} aria-label={`Walk to ${room.name}`} aria-current={player.roomId === room.id ? "location" : undefined} className="absolute overflow-hidden border border-white/45 text-left transition hover:brightness-110 focus:z-20 focus:outline focus:outline-2 focus:outline-white" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, background: room.color }} title={`${room.name}: ${room.description}`}><span className="absolute left-1 top-1 max-w-[calc(100%-6px)] truncate text-[7px] font-bold uppercase tracking-wide text-white/85">{room.shortName}</span>{count > 0 && <span className="absolute bottom-1 right-1 rounded-full bg-white/90 px-1 text-[7px] font-extrabold text-[#173f2b]">{count}</span>}</button>;
      })}
      <span className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ff8a4c] shadow" style={{ left: mapX(player.x), top: mapY(player.z) }} />
      {Object.values(remotePlayers).map((remote) => <span key={remote.id} className="pointer-events-none absolute z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow" style={{ left: mapX(remote.x), top: mapY(remote.z), background: remote.color }} />)}
    </div><p className="mt-2 text-[10px] leading-4 text-[#68736b]">Choose a room to walk there. Dots show teammates live.</p></>}
  </section>;
}

function DashboardView({ view, tasks, moveTask, addTask, workspaceId, workspaceRole, displayName, workspaceName }: { view: Exclude<View, "office">; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"]; workspaceId: string; workspaceRole: WorkspaceSummary["role"]; displayName: string; workspaceName: string }) {
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
  return <div className="h-full overflow-auto p-4 md:p-7"><Overview view={view} tasks={tasks} displayName={displayName} workspaceName={workspaceName} /></div>;
}

function Overview({ view, tasks, displayName, workspaceName }: { view: Exclude<View, "office" | "projects" | "tasks">; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; displayName: string; workspaceName: string }) {
  const firstName = displayName.trim().split(/\s+/)[0] || "there";
  const openTasks = tasks.filter((task) => task.status !== "Done").length;
  return <div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow mb-3">{workspaceName} · Daily brief</div><h2 className="text-3xl font-extrabold tracking-[-.045em] md:text-[2.5rem]">Good afternoon, {firstName}.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#68736b] md:text-base">Your workspace is moving. Here’s what deserves attention next.</p></div><Button><Plus size={17} /> Create new</Button></div>
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Active projects" value="3" note="One needs attention" color="#c8f560" /><Metric label="Open tasks" value={String(openTasks)} note="2 due this week" color="#ffc98b" /><Metric label="Team availability" value="67%" note="2 of 3 online" color="#9dd8c1" /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><section className="surface-card rounded-[24px] p-5 md:p-6"><div className="mb-4 flex items-center justify-between"><div><div className="eyebrow">Focus queue</div><h3 className="mt-1 font-bold">Priority work</h3></div><Button variant="ghost" size="sm">View all</Button></div><div className="space-y-2">{tasks.slice(0,3).map((task) => <div key={task.id} className="group flex items-center gap-3 rounded-2xl border border-black/[.055] bg-white/65 p-3 transition hover:border-black/10 hover:bg-white hover:shadow-sm"><button className="h-5 w-5 rounded-md border-2 border-black/15 transition group-hover:border-[#397455]" aria-label={`Complete ${task.title}`} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{task.title}</div><div className="mt-0.5 text-xs text-[#68736b]">{task.project} · {task.due}</div></div><Badge className={task.priority === "High" ? "bg-[#ffe0d1] text-[#8a3d24]" : "bg-black/5 text-[#68736b]"}>{task.priority}</Badge></div>)}</div></section><section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#173f2b_0%,#0f2e20_100%)] p-5 text-white shadow-[0_22px_50px_rgba(15,46,32,.18)] md:p-6"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#c8f560]/10" /><div className="relative flex items-center justify-between"><div className="eyebrow !text-[#c8f560]">Next up</div><CalendarDays size={18} className="text-[#c8f560]" /></div><div className="relative mt-8 text-xs font-semibold text-white/50">3:30–4:00 PM</div><div className="relative mt-1 text-xl font-bold">Weekly product pulse</div><p className="relative mt-2 text-sm leading-6 text-white/65">Align on launch blockers and lock the beta timeline.</p><div className="relative mt-5 flex -space-x-2"><div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#173f2b] bg-[#efad73] text-xs font-bold text-[#17211b]">AF</div><div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#173f2b] bg-[#a8d4ed] text-xs font-bold text-[#17211b]">SK</div><div className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#173f2b] bg-[#d7b4e6] text-xs font-bold text-[#17211b]">MJ</div></div><Button className="relative mt-5 w-full border-[#c8f560] bg-[#c8f560] text-[#173f2b] shadow-none hover:border-[#d5ff77] hover:bg-[#d5ff77]">Open agenda</Button></section></div>
    {view !== "overview" && <div className="mt-4 rounded-[24px] border border-dashed border-black/15 bg-white/45 p-10 text-center"><h3 className="font-bold capitalize">{view} workspace</h3><p className="mt-2 text-sm text-[#68736b]">This view is wired into the shared application shell and ready for Supabase data.</p></div>}
  </div>;
}

function Metric({ label, value, note, color }: { label: string; value: string; note: string; color: string }) { return <div className="surface-card group rounded-[24px] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,31,23,.08)]"><div className="flex items-center justify-between text-sm font-medium text-[#68736b]"><span>{label}</span><span className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_5px_rgba(0,0,0,.025)]" style={{ background: color }} /></div><div className="mt-4 text-4xl font-extrabold tracking-[-.06em]">{value}</div><div className="mt-1 text-xs font-medium text-[#7b867e]">{note}</div></div>; }

function QuickStartDialog({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (view: View) => void }) {
  return <Dialog open={open} title="Make yourself at home" onClose={onClose}>
    <div className="rounded-[22px] bg-[#173f2b] p-5 text-white">
      <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#c8f560] text-[#173f2b]"><Command size={22} /></div><div><h3 className="font-bold">Orbit keeps work and presence in one place</h3><p className="mt-1 text-sm leading-6 text-white/65">Move through the office, find your priorities, and start collaborating without hunting through menus.</p></div></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <section className="rounded-2xl border border-black/[.07] bg-white p-4"><div className="flex items-center gap-2 font-bold"><DoorOpen size={17} className="text-[#397455]" /> Explore the office</div><p className="mt-2 text-sm leading-6 text-[#68736b]">Use WASD or arrow keys, click the floor to walk, and press E near an object to interact.</p></section>
      <section className="rounded-2xl border border-black/[.07] bg-white p-4"><div className="flex items-center gap-2 font-bold"><Headphones size={17} className="text-[#397455]" /> Talk when you choose</div><p className="mt-2 text-sm leading-6 text-[#68736b]">Huddles and proximity audio are opt-in. Orbit asks before using your microphone or camera.</p></section>
      <section className="rounded-2xl border border-black/[.07] bg-white p-4"><div className="flex items-center gap-2 font-bold"><Search size={17} className="text-[#397455]" /> Jump anywhere</div><p className="mt-2 text-sm leading-6 text-[#68736b]">Open workspace search with <kbd className="rounded-md bg-black/5 px-1.5 py-0.5 text-xs">⌘ K</kbd> or use the search button on any screen.</p></section>
      <section className="rounded-2xl border border-black/[.07] bg-white p-4"><div className="flex items-center gap-2 font-bold"><Users size={17} className="text-[#397455]" /> Know who is around</div><p className="mt-2 text-sm leading-6 text-[#68736b]">Open the people panel to see availability. Set your own status from the top bar.</p></section>
    </div>
    <div className="mt-4 rounded-2xl bg-[#edf3e7] p-4"><div className="text-xs font-bold uppercase tracking-[.15em] text-[#4b7a5e]">Office shortcuts</div><div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-4"><Shortcut keys="WASD" label="Move" /><Shortcut keys="E" label="Interact" /><Shortcut keys="F" label="Sit / stand" /><Shortcut keys="V" label="Change view" /></div></div>
    <div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => onNavigate("team")}><Users size={17} /> View team</Button><Button onClick={() => onNavigate("tasks")}><CheckSquare2 size={17} /> Open my tasks</Button></div>
  </Dialog>;
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return <div className="flex items-center gap-2"><kbd className="min-w-8 rounded-lg border border-black/10 bg-white px-2 py-1 text-center text-xs font-bold shadow-sm">{keys}</kbd><span className="text-[#59665e]">{label}</span></div>;
}

function FeatureDialog({ kind, onClose, tasks, moveTask, addTask, huddle, workspaceId, workspaceName }: { kind: ReturnType<typeof useOfficeStore.getState>["activePanel"]; onClose: () => void; tasks: ReturnType<typeof useWorkspaceData>["tasks"]; moveTask: ReturnType<typeof useWorkspaceData>["moveTask"]; addTask: ReturnType<typeof useWorkspaceData>["addTask"]; huddle: HuddleController; workspaceId: string; workspaceName: string }) {
  if (!kind) return null;
  if (kind === "projects") return <Dialog open title="Project board" onClose={onClose}><KanbanView workspaceId="northstar-demo" /></Dialog>;
  if (kind === "whiteboard") return <Dialog open title="Spatial Whiteboard" onClose={onClose}><WhiteboardPanel workspaceId={workspaceId} /></Dialog>;
  if (kind === "focus") return <Dialog open title="Focus pod" onClose={onClose}><FocusPanel /></Dialog>;
  if (kind === "ai_assistant") return <Dialog open title="AI Startup Copilot" size="xl" onClose={onClose}><AIAssistantPanel tasks={tasks} addTask={addTask} workspaceName={workspaceName} /></Dialog>;
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
