"use client";

import { useEffect, useState } from "react";
import { Monitor, MonitorPlay, Square, ChevronLeft, ChevronRight, Maximize2, Radio, Sparkles, Smile, GitPullRequest, GitMerge, Check, DollarSign, Flame, Clock, Lock, Globe } from "lucide-react";
import { useOfficeStore } from "./store";
import { startScreenShare, stopScreenShare } from "./screen-share";
import { playChime, playCoffeeSound, playSlideClick } from "./audio";
import { getOfficeRoomAt } from "./office-data";

export function SpatialOverlays({ displayName }: { displayName: string }) {
  const player = useOfficeStore((state) => state.player);
  const isScreenSharing = useOfficeStore((state) => state.isScreenSharing);
  const presenterName = useOfficeStore((state) => state.presenterName);
  const boardroomSlide = useOfficeStore((state) => state.boardroomSlide);
  const nextBoardroomSlide = useOfficeStore((state) => state.nextBoardroomSlide);
  const prevBoardroomSlide = useOfficeStore((state) => state.prevBoardroomSlide);
  const triggerEmote = useOfficeStore((state) => state.triggerEmote);
  const startupMetrics = useOfficeStore((state) => state.startupMetrics);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const openAITeammate = useOfficeStore((state) => state.openAITeammate);
  const setIsCaffeinated = useOfficeStore((state) => state.setIsCaffeinated);
  const toggleLofi = useOfficeStore((state) => state.toggleLofi);

  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showFullscreenTV, setShowFullscreenTV] = useState(false);
  const [mergedPRs, setMergedPRs] = useState<number[]>([]);

  // Gather.town Spatial Room & Audio Perimeter Detection
  const currentRoom = getOfficeRoomAt(player.x, player.z);
  const inPhoneBooth = Math.hypot(player.x - 2.4, player.z - (-6.4)) <= 1.4;
  const isPrivateSpace = inPhoneBooth || (currentRoom ? ["boardroom", "team-studio", "strategy", "social"].includes(currentRoom.id) : false);

  // Check proximity to Boardroom: x: [-8.5, -3.8], z: [-5.8, -1.8]
  const inBoardroom = Math.hypot(player.x - (-6.2), player.z - (-3.7)) < 3.8;

  const executeInteraction = () => {
    if (!nearbyAction) return;
    if (nearbyAction.teammateId) {
      playChime();
      openAITeammate(nearbyAction.teammateId);
    } else if (nearbyAction.special === "espresso") {
      playCoffeeSound();
      setIsCaffeinated(true);
    } else if (nearbyAction.special === "vinyl") {
      playChime();
      toggleLofi();
    } else {
      playChime();
      openPanel(nearbyAction.kind);
    }
  };

  // Listen for Z key to toggle Emote Wheel, X or E to interact
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["input", "textarea"].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      if (e.key.toLowerCase() === "z") {
        setShowEmoteWheel((prev) => !prev);
      }
      if ((e.key.toLowerCase() === "x" || e.key.toLowerCase() === "e") && nearbyAction) {
        executeInteraction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nearbyAction, openPanel, openAITeammate, setIsCaffeinated, toggleLofi]);

  const emotes = [
    { emoji: "🚀", label: "Ship it!" },
    { emoji: "🔥", label: "Fire" },
    { emoji: "💡", label: "Idea" },
    { emoji: "👏", label: "Applause" },
    { emoji: "☕", label: "Coffee" },
    { emoji: "🎉", label: "Celebrate" },
    { emoji: "❤️", label: "Love" },
    { emoji: "👀", label: "Looking" },
  ];

  const handleEmoteClick = (emoji: string) => {
    triggerEmote(emoji);
    playChime();
    setShowEmoteWheel(false);
  };

  const handleMergePR = (prId: number) => {
    setMergedPRs((prev) => [...prev, prId]);
    playChime();
    triggerEmote("🎉");
    triggerEmote("🚀");
  };

  const samplePRs = [
    { id: 101, title: "feat: add 60fps WebRTC video texture display in boardroom", author: "Alex (AI)", branch: "feat/screen-share", additions: "+342", deletions: "-18" },
    { id: 102, title: "perf: spatial audio distance attenuation curve", author: "Ateeb Fatmi", branch: "perf/proximity-audio", additions: "+128", deletions: "-42" },
    { id: 103, title: "design: Scandinavian minimalist penthouse terrace", author: "Maya (AI)", branch: "design/terrace", additions: "+410", deletions: "-8" },
    { id: 104, title: "fix: client side render hydration mismatch on canvas", author: "Alex (AI)", branch: "fix/hydration", additions: "+14", deletions: "-9" },
  ];

  return (
    <>
      {/* 1. Gather.town Top Audio Perimeter HUD (Private Space / Proximity Audio) */}
      <div className="absolute top-[88px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 px-4 py-1.5 text-xs shadow-xl backdrop-blur-md transition-all duration-200 select-none bg-[#121c17]/95 text-white">
        {inPhoneBooth ? (
          <>
            <span className="flex h-2 w-2 rounded-full bg-[#c8f560] animate-pulse" />
            <span className="font-bold text-[#c8f560] flex items-center gap-1">
              <Lock size={12} />
              <span>Phone Booth</span>
            </span>
            <span className="text-white/30">·</span>
            <span className="font-semibold text-white/95">Acoustic Isolation</span>
            <span className="text-white/30">·</span>
            <span className="text-[11px] text-white/70">100% soundproof · 1-on-1 private calls</span>
          </>
        ) : isPrivateSpace ? (
          <>
            <span className="flex h-2 w-2 rounded-full bg-[#c8f560] animate-pulse" />
            <span className="font-bold text-[#c8f560] flex items-center gap-1">
              <Lock size={12} />
              <span>Private Space</span>
            </span>
            <span className="text-white/30">·</span>
            <span className="font-semibold text-white/95">{currentRoom?.name}</span>
            <span className="text-white/30">·</span>
            <span className="text-[11px] text-white/70">Audio is private to this room</span>
          </>
        ) : (
          <>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-[#c8f560] flex items-center gap-1">
              <Globe size={12} />
              <span>{currentRoom ? currentRoom.name : "Open Floor"}</span>
            </span>
            <span className="text-white/30">·</span>
            <span className="text-[11px] text-white/70">Proximity audio active · 3m range</span>
          </>
        )}
      </div>

      {/* 2. Gather.town Signature [X] Interaction Prompt */}
      {nearbyAction && (
        <div className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-black/10 bg-[#121c17]/95 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
          <kbd className="grid h-6 w-6 place-items-center rounded-lg bg-[#c8f560] text-xs font-black text-[#17211b] shadow-xs">
            X
          </kbd>
          <span className="text-xs font-medium text-white/90">
            Press <strong className="text-[#c8f560] font-bold">[X]</strong> or <strong className="text-white font-bold">[E]</strong> to {nearbyAction.label.toLowerCase()}
          </span>
          <button
            onClick={executeInteraction}
            className="ml-2 rounded-xl bg-white/10 px-3 py-1 text-xs font-bold text-[#c8f560] hover:bg-white/20 transition cursor-pointer"
          >
            Interact
          </button>
        </div>
      )}

      {/* 3. Boardroom Presenter Toolbar (Appears when in Executive Boardroom) */}
      {inBoardroom && (
        <div className="absolute top-[132px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/20 bg-[#17211b]/95 p-2 shadow-2xl backdrop-blur-md text-white animate-in fade-in duration-200">
          <div className="flex items-center gap-2 px-3 border-r border-white/15">
            <span className="h-2 w-2 rounded-full bg-[#c8f560] animate-pulse" />
            <span className="text-xs font-bold text-[#c8f560]">Boardroom 85&quot; Display</span>
          </div>

          {/* Screen Share Action */}
          {isScreenSharing ? (
            <button
              onClick={stopScreenShare}
              className="flex items-center gap-1.5 rounded-xl bg-red-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-500 transition"
            >
              <Square size={13} fill="currentColor" />
              <span>Stop Share ({presenterName || "Live"})</span>
            </button>
          ) : (
            <button
              onClick={() => startScreenShare(displayName)}
              className="flex items-center gap-1.5 rounded-xl bg-[#c8f560] px-3 py-1.5 text-xs font-bold text-[#17211b] shadow-sm hover:bg-[#d8ff7a] transition"
            >
              <MonitorPlay size={14} />
              <span>Share Screen to TV</span>
            </button>
          )}

          {/* Slide Navigator */}
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => { prevBoardroomSlide(); playSlideClick(); }}
              className="rounded-lg p-1 hover:bg-white/10 text-white/80"
              title="Previous Slide"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1 text-[11px] font-semibold text-white/70 select-none">
              Slide {boardroomSlide + 1} / 3
            </span>
            <button
              onClick={() => { nextBoardroomSlide(); playSlideClick(); }}
              className="rounded-lg p-1 hover:bg-white/10 text-white/80"
              title="Next Slide"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Fullscreen Expand */}
          <button
            onClick={() => setShowFullscreenTV(true)}
            className="rounded-lg p-1.5 hover:bg-white/10 text-white/80"
            title="Expand Presentation Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      {/* 4. Compact Startup Health & GitHub PRs Hub */}
      <div className="absolute top-[88px] left-5 z-10 hidden xl:flex items-center gap-1.5 rounded-full border border-white/40 bg-[#fffdf7]/95 px-3 py-1 text-xs shadow-panel backdrop-blur-md text-[#17211b]">
        <span className="font-bold text-[#327a56]">MRR</span>
        <span className="font-semibold">${startupMetrics.mrr.toLocaleString()}</span>
        <span className="text-[10px] text-emerald-600 font-bold">+18%</span>
        <span className="text-black/20">·</span>
        <span className="text-[#68736b]">{startupMetrics.runwayMonths}m runway</span>
        <span className="text-black/20">·</span>
        <button
          onClick={() => setShowPRModal(true)}
          className="flex items-center gap-1 rounded-full bg-[#17211b] px-2.5 py-0.5 text-[11px] font-bold text-[#c8f560] hover:bg-[#23583c] transition"
        >
          <GitPullRequest size={11} />
          <span>{startupMetrics.activePRs - mergedPRs.length} PRs</span>
        </button>
      </div>

      {/* 3. Bottom Emote Trigger Button */}
      <div className="absolute bottom-4 right-5 z-20">
        <button
          onClick={() => setShowEmoteWheel((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-2xl border border-white/40 bg-[#fffdf7]/95 px-3 py-2 text-xs font-bold text-[#17211b] shadow-panel backdrop-blur-md hover:bg-black/5 transition"
          title="Send Reaction Emote (Shortcut: Z)"
        >
          <Smile size={16} className="text-[#ff8a4c]" />
          <span>React (Z)</span>
        </button>

        {/* Emote Radial Popup */}
        {showEmoteWheel && (
          <div className="absolute bottom-12 right-0 mb-2 flex flex-col gap-1 rounded-2xl border border-black/10 bg-[#fffdf7] p-2 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-bold text-[#68736b] uppercase tracking-wider">
              Quick Reactions
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {emotes.map((item) => (
                <button
                  key={item.emoji}
                  onClick={() => handleEmoteClick(item.emoji)}
                  className="flex flex-col items-center justify-center h-12 w-12 rounded-xl hover:bg-black/5 text-xl transition active:scale-90"
                  title={item.label}
                >
                  <span>{item.emoji}</span>
                  <span className="text-[8px] font-semibold text-[#68736b]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. GitHub PR Review Modal */}
      {showPRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-[#fffdf7] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-black/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#17211b] text-[#c8f560]">
                  <GitPullRequest size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17211b]">GitHub Pull Requests</h3>
                  <p className="text-xs text-[#68736b]">Active codebase changes for Startup OS</p>
                </div>
              </div>
              <button
                onClick={() => setShowPRModal(false)}
                className="rounded-lg p-1.5 text-[#68736b] hover:bg-black/5"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {samplePRs.map((pr) => {
                const isMerged = mergedPRs.includes(pr.id);
                return (
                  <div
                    key={pr.id}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 transition ${
                      isMerged ? "bg-emerald-50/60 border-emerald-200" : "bg-white border-black/10 hover:border-black/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#17211b]">#{pr.id}</span>
                        <span className="truncate text-xs font-semibold text-[#17211b]">{pr.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[#68736b]">
                        <span>by {pr.author}</span>
                        <span>·</span>
                        <code className="rounded bg-black/5 px-1 py-0.5">{pr.branch}</code>
                        <span className="text-emerald-700 font-bold">{pr.additions}</span>
                        <span className="text-red-600 font-bold">{pr.deletions}</span>
                      </div>
                    </div>

                    {isMerged ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">
                        <Check size={12} /> Merged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMergePR(pr.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#17211b] text-[#c8f560] px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-[#23583c] transition"
                      >
                        <GitMerge size={13} />
                        <span>Merge PR</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Boardroom Display Mode */}
      {showFullscreenTV && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1410] text-white p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#c8f560] animate-pulse" />
              <h2 className="text-lg font-bold">Executive Boardroom · 85&quot; Presentation Screen</h2>
            </div>
            <button
              onClick={() => setShowFullscreenTV(false)}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
            >
              Close Fullscreen
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl aspect-video rounded-3xl bg-gradient-to-br from-[#132c22] to-[#0c1813] border border-white/20 p-8 shadow-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm font-black tracking-widest text-[#c8f560] uppercase">
                  {boardroomSlide === 0 ? "🚀 Q4 LAUNCH ROADMAP" : boardroomSlide === 1 ? "📡 SPATIAL MESH NETWORK HEALTH" : "📈 SEED TRACTION ROUND"}
                </span>
                <span className="rounded bg-black/40 px-3 py-1 text-xs font-bold text-white/80">
                  Slide {boardroomSlide + 1} / 3
                </span>
              </div>
              <div className="my-auto py-8">
                <div className="text-5xl font-black text-white">
                  {boardroomSlide === 0 ? "94.2% Velocity" : boardroomSlide === 1 ? "18ms Peer Latency" : "$1.5M Seed Target"}
                </div>
                <p className="mt-3 text-base text-white/75 font-medium">
                  {boardroomSlide === 0 ? "Beta launch in 12 days · 0 blocker items · Sprint #14 complete" : boardroomSlide === 1 ? "WebRTC DataChannel active · Supabase Broadcast sync · 99.98% uptime" : "$1.18M committed (78.6%) · 1,420 active workspaces · 42m avg DAU"}
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/10 text-sm text-[#c8f560]">
                <button onClick={() => { prevBoardroomSlide(); playSlideClick(); }} className="hover:underline">◀ Previous Slide</button>
                <button onClick={() => { nextBoardroomSlide(); playSlideClick(); }} className="hover:underline">Next Slide ▶</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
