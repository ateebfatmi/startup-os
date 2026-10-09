import dynamic from "next/dynamic";

const WorkspaceShell = dynamic(
  () => import("@/features/workspace/workspace-shell").then((module) => module.WorkspaceShell),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center bg-[#173f2b] text-[#f5f0e4]">Preparing your office…</div> },
);

export default function OfficePage() {
  return <WorkspaceShell />;
}
