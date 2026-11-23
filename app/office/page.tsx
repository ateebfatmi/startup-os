"use client";

import dynamic from "next/dynamic";
import { Command } from "lucide-react";

const WorkspaceShell = dynamic(
  () => import("@/features/workspace/workspace-shell").then((module) => module.WorkspaceShell),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0d2217] text-[#f5f0e4]">
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#1b4332] opacity-40 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#c8f560] opacity-15 blur-[120px]" />
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute h-24 w-24 rounded-3xl bg-[#c8f560]/10 animate-ping duration-1000" />
            <div className="absolute h-20 w-20 rounded-2xl bg-[#c8f560]/15 blur-sm animate-pulse" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-[#c8f560] text-[#173f2b] shadow-[0_8px_32px_rgba(200,245,96,0.3)]">
              <Command size={32} strokeWidth={2.7} />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white/95">Entering Virtual Headquarters</h2>
          <p className="mt-1.5 text-xs font-medium text-white/60">Synchronizing spatial environment & team presence…</p>
          <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full origin-left animate-pulse bg-gradient-to-r from-[#52aa72] to-[#c8f560]" />
          </div>
        </div>
      </div>
    ),
  },
);

export default function OfficePage() {
  return <WorkspaceShell />;
}
