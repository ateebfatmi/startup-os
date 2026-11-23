"use client";

import dynamic from "next/dynamic";

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
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1b4b32] to-[#0f2c1e] border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.36)] grid place-items-center animate-pulse">
              <span className="text-[#c8f560] text-2xl font-black">✦</span>
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white/95">Preparing Virtual Office…</h2>
          <p className="mt-1.5 text-xs font-medium text-white/60">Configuring 3D architectural workspace</p>
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
