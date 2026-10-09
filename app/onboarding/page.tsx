"use client";

import { Building2, Check, Command, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const templates = [
  { id: "studio", title: "Product studio", note: "Open tables, two focus pods, one meeting room" },
  { id: "remote", title: "Remote HQ", note: "A balanced home for meetings and focused work" },
  { id: "agency", title: "Client lab", note: "Project zones with a larger presentation room" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("Northstar Labs");
  const [template, setTemplate] = useState("remote");
  return <main className="min-h-screen bg-[#f4f1e8] p-5 md:p-10"><div className="mx-auto max-w-4xl"><div className="flex items-center gap-2.5 font-bold"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]"><Command size={19} /></div>orbit</div><div className="mt-10 grid gap-8 lg:grid-cols-[.72fr_1.28fr]"><aside><span className="text-sm font-bold text-[#4b7a5e]">STEP 1 OF 2</span><h1 className="mt-3 text-4xl font-bold tracking-[-.05em]">Give your team a place to meet.</h1><p className="mt-4 leading-7 text-[#68736b]">Start with one flexible office. You can rename rooms and change the layout later.</p><div className="mt-7 space-y-3 text-sm"><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#c8f560]"><Check size={15} /></span>Keyboard-ready 3D office</div><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#c8f560]"><Check size={15} /></span>Project and meeting spaces</div><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#c8f560]"><Check size={15} /></span>Invite teammates when ready</div></div></aside><section className="rounded-[28px] border border-black/[.07] bg-[#fffdf7] p-5 shadow-panel md:p-7"><label className="text-sm font-bold">Workspace name<div className="relative mt-2"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#68736b]" size={18} /><input value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-xl border border-black/10 bg-white pl-12 pr-4 outline-none focus:border-[#4b7a5e]" /></div></label><fieldset className="mt-7"><legend className="text-sm font-bold">Choose an office layout</legend><div className="mt-3 grid gap-3">{templates.map((item) => <button key={item.id} onClick={() => setTemplate(item.id)} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${template === item.id ? "border-[#315e45] bg-[#eef6e6]" : "border-black/[.08] bg-white hover:border-black/20"}`}><span className={`grid h-11 w-11 place-items-center rounded-xl ${template === item.id ? "bg-[#173f2b] text-[#c8f560]" : "bg-black/5 text-[#68736b]"}`}><Users size={19} /></span><span className="flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-[#68736b]">{item.note}</span></span>{template === item.id && <Check size={18} className="text-[#315e45]" />}</button>)}</div></fieldset><Button className="mt-7 w-full" disabled={!name.trim()} onClick={() => router.push("/office")}>Create workspace</Button><button className="mt-3 w-full py-2 text-sm text-[#68736b] hover:underline" onClick={() => router.push("/office")}>Skip and explore the demo</button></section></div></div></main>;
}
