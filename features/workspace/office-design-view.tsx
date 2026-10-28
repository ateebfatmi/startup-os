"use client";

import { Check, Leaf, Loader2, Moon, Save, Sparkles, SunMedium } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OFFICE_THEME_PALETTES, type OfficeTheme } from "@/features/virtual-office/office-design";
import { useOfficeStore } from "@/features/virtual-office/store";
import { saveOfficeDesign } from "./office-design-service";

const THEME_ICONS = { atelier: SunMedium, biophilic: Leaf, midnight: Moon };
const ACCENTS = ["#c9a562", "#c8f560", "#ff8a4c", "#72e5ff", "#d7b4e6"];

export function OfficeDesignView({ workspaceId, canEdit }: { workspaceId: string; canEdit: boolean }) {
  const design = useOfficeStore((state) => state.officeDesign);
  const setDesign = useOfficeStore((state) => state.setOfficeDesign);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const update = (patch: Partial<typeof design>) => { if (!canEdit) return; setDesign({ ...design, ...patch }); setMessage(null); };
  const save = async () => {
    setSaving(true); setMessage(null);
    try { await saveOfficeDesign(workspaceId, design); setMessage("Office design saved for this workspace."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save office design"); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-6xl space-y-7 p-4 md:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold tracking-[.18em] text-[#4b7a5e]"><Sparkles size={15} /> OFFICE DESIGN STUDIO</div><h2 className="mt-2 text-3xl font-bold tracking-tight">Shape the atmosphere</h2><p className="mt-1 text-sm text-[#68736b]">Changes preview live in the 3D office and persist for every workspace member after saving.</p></div><Button onClick={() => void save()} disabled={saving || !canEdit}>{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Save design</Button></div>
    {!canEdit && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Only workspace owners and admins can change the shared office design.</div>}
    {message && <div className="rounded-2xl border border-[#c9ddbc] bg-[#eef6e6] p-4 text-sm text-[#315e45]">{message}</div>}
    <section><h3 className="font-bold">Design direction</h3><div className="mt-3 grid gap-4 md:grid-cols-3">{(Object.entries(OFFICE_THEME_PALETTES) as [OfficeTheme, (typeof OFFICE_THEME_PALETTES)[OfficeTheme]][]).map(([key, theme]) => { const Icon = THEME_ICONS[key]; const selected = design.theme === key; return <button key={key} disabled={!canEdit} aria-pressed={selected} onClick={() => update({ theme: key })} className={`relative overflow-hidden rounded-[24px] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${selected ? "border-[#315e45] ring-2 ring-[#c8f560]" : "border-black/[.08] hover:border-black/20"}`} style={{ background: theme.floor, color: key === "midnight" ? "white" : "#17211b" }}><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: theme.foundation, color: design.accentColor }}><Icon size={20} /></span>{selected && <span className="grid h-7 w-7 place-items-center rounded-full bg-[#c8f560] text-[#173f2b]"><Check size={15} /></span>}</div><h4 className="mt-6 font-bold">{theme.label}</h4><p className={`mt-2 text-xs leading-5 ${key === "midnight" ? "text-white/65" : "text-black/55"}`}>{theme.description}</p><div className="mt-5 flex gap-1.5">{[theme.foundation, theme.floor, theme.promenade, theme.rug].map((color) => <span key={color} className="h-3 flex-1 rounded-full border border-black/10" style={{ background: color }} />)}</div></button>; })}</div></section>
    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-[24px] border border-black/[.07] bg-[#fffdf7] p-5"><h3 className="font-bold">Signature accent</h3><p className="mt-1 text-xs leading-5 text-[#68736b]">Used for architectural inlays and interaction highlights.</p><div className="mt-5 flex flex-wrap gap-3">{ACCENTS.map((color) => <button key={color} disabled={!canEdit} aria-label={`Use accent ${color}`} onClick={() => update({ accentColor: color })} className={`grid h-11 w-11 place-items-center rounded-full border-4 border-white shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${design.accentColor === color ? "ring-2 ring-[#173f2b]" : ""}`} style={{ background: color }}>{design.accentColor === color && <Check size={17} className="text-[#173f2b]" />}</button>)}</div></div><div className="rounded-[24px] border border-black/[.07] bg-[#fffdf7] p-5"><h3 className="font-bold">Spatial features</h3><p className="mt-1 text-xs leading-5 text-[#68736b]">Tune visual density for the way your team works.</p><div className="mt-4 space-y-3"><Toggle label="Penthouse terrace" note="Keep the outdoor lounge and skyline edge." checked={design.terraceEnabled} disabled={!canEdit} onChange={(value) => update({ terraceEnabled: value })} /><Toggle label="Biophilic planting" note="Show premium planters throughout the office." checked={design.plantsEnabled} disabled={!canEdit} onChange={(value) => update({ plantsEnabled: value })} /></div></div></section>
  </div>;
}

function Toggle({ label, note, checked, disabled, onChange }: { label: string; note: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className={`flex items-center gap-3 rounded-2xl bg-black/[.025] p-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#173f2b]" /><span><strong className="block text-sm">{label}</strong><span className="text-xs text-[#68736b]">{note}</span></span></label>;
}
