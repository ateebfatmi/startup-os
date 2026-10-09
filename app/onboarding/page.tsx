"use client";

import { Building2, Check, Command, Loader2, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildWorkspaceSlug } from "@/features/auth/auth-utils";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

const templates = [
  { id: "product-studio", title: "Product studio", note: "Open tables, two focus pods, one meeting room" },
  { id: "remote-hq", title: "Remote HQ", note: "A balanced home for meetings and focused work" },
  { id: "client-lab", title: "Client lab", note: "Project zones with a larger presentation room" },
] as const;

const workspaceTypes = ["Startup", "Agency", "Remote team", "Community"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("Northstar Labs");
  const [workspaceType, setWorkspaceType] = useState<(typeof workspaceTypes)[number]>("Startup");
  const [template, setTemplate] = useState<(typeof templates)[number]["id"]>("remote-hq");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedName = window.localStorage.getItem("orbit-display-name");
    if (storedName) setDisplayName(storedName);
    if (!hasSupabaseConfig) return;
    void createSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      const fallback = data.user?.user_metadata.display_name as string | undefined;
      if (fallback) setDisplayName((current) => current || fallback);
    });
  }, []);

  const createWorkspace = async () => {
    const profileName = displayName.trim();
    const workspaceName = name.trim();
    if (!profileName) { setMessage("Enter the name your teammates should see."); return; }
    if (!workspaceName) { setMessage("Name your workspace before continuing."); return; }
    setSubmitting(true);
    setMessage(null);

    if (!hasSupabaseConfig) {
      window.localStorage.setItem("orbit-display-name", profileName);
      window.localStorage.setItem("orbit-workspace-name", workspaceName);
      window.localStorage.setItem("orbit-workspace-type", workspaceType);
      window.localStorage.setItem("orbit-office-template", template);
      router.push("/office");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { setMessage("Your session expired. Sign in again to continue."); setSubmitting(false); return; }
    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: profileName }, { onConflict: "id" });
    if (profileError) { setMessage(profileError.message); setSubmitting(false); return; }

    const slug = buildWorkspaceSlug(workspaceName, user.id);
    const { data: workspaceId, error } = await supabase.rpc("create_workspace", { workspace_name: workspaceName, workspace_slug: slug, template_key: template });
    if (error || !workspaceId) { setMessage(error?.message ?? "The workspace could not be created."); setSubmitting(false); return; }
    const { error: settingsError } = await supabase.from("workspaces").update({ settings: { type: workspaceType } }).eq("id", workspaceId);
    if (settingsError) { setMessage(settingsError.message); setSubmitting(false); return; }

    window.localStorage.setItem("orbit-display-name", profileName);
    window.localStorage.setItem("orbit-workspace-name", workspaceName);
    window.localStorage.setItem("orbit-workspace-type", workspaceType);
    window.localStorage.setItem("orbit-office-template", template);
    window.localStorage.setItem("orbit-workspace-id", String(workspaceId));
    router.push("/office");
    router.refresh();
  };

  return <main className="min-h-screen bg-[#f4f1e8] p-5 md:p-10"><div className="mx-auto max-w-5xl"><div className="flex items-center gap-2.5 font-bold"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]"><Command size={19} /></div>orbit</div><div className="mt-10 grid gap-8 lg:grid-cols-[.68fr_1.32fr]"><aside><span className="text-sm font-bold text-[#4b7a5e]">WORKSPACE SETUP</span><h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Give your team a place to meet.</h1><p className="mt-4 leading-7 text-[#68736b]">Set your identity, choose a workspace style, and enter a ready-to-use 3D office.</p><div className="mt-7 space-y-3 text-sm"><CheckLine>Persistent member profile</CheckLine><CheckLine>Private workspace membership</CheckLine><CheckLine>Keyboard-ready 3D office</CheckLine><CheckLine>Project and meeting spaces</CheckLine></div></aside>
    <section className="rounded-[28px] border border-black/[.07] bg-[#fffdf7] p-5 shadow-panel md:p-7">
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Your display name" icon={<UserRound size={18} />}><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="h-12 w-full bg-transparent pl-11 pr-4 outline-none" placeholder="Ateeb Fatmi" /></Field><Field label="Workspace name" icon={<Building2 size={18} />}><input value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full bg-transparent pl-11 pr-4 outline-none" /></Field></div>
      <fieldset className="mt-7"><legend className="text-sm font-bold">What kind of team is this?</legend><div className="mt-3 flex flex-wrap gap-2">{workspaceTypes.map((item) => <button type="button" key={item} onClick={() => setWorkspaceType(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${workspaceType === item ? "border-[#315e45] bg-[#173f2b] text-white" : "border-black/10 bg-white text-[#68736b] hover:border-black/25"}`}>{item}</button>)}</div></fieldset>
      <fieldset className="mt-7"><legend className="text-sm font-bold">Choose an office layout</legend><div className="mt-3 grid gap-3">{templates.map((item) => <button type="button" key={item.id} onClick={() => setTemplate(item.id)} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${template === item.id ? "border-[#315e45] bg-[#eef6e6]" : "border-black/[.08] bg-white hover:border-black/20"}`}><span className={`grid h-11 w-11 place-items-center rounded-xl ${template === item.id ? "bg-[#173f2b] text-[#c8f560]" : "bg-black/5 text-[#68736b]"}`}><Users size={19} /></span><span className="flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-[#68736b]">{item.note}</span></span>{template === item.id && <Check size={18} className="text-[#315e45]" />}</button>)}</div></fieldset>
      {message && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}
      <Button className="mt-7 w-full" disabled={submitting || !name.trim() || !displayName.trim()} onClick={() => void createWorkspace()}>{submitting ? <><Loader2 className="animate-spin" size={17} /> Creating your office…</> : hasSupabaseConfig ? "Create workspace" : "Enter local demo"}</Button>
      <button className="mt-3 w-full py-2 text-sm text-[#68736b] hover:underline" onClick={() => router.push("/login")}>{hasSupabaseConfig ? "Use another account" : "Back to sign in"}</button>
    </section></div></div></main>;
}

function CheckLine({ children }: { children: React.ReactNode }) { return <div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#c8f560]"><Check size={15} /></span>{children}</div>; }

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) { return <label className="text-sm font-bold">{label}<div className="relative mt-2 flex h-12 items-center rounded-xl border border-black/10 bg-white focus-within:border-[#4b7a5e]"><span className="pointer-events-none absolute left-4 text-[#68736b]">{icon}</span>{children}</div></label>; }
