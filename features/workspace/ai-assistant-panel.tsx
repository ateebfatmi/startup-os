"use client";

import { useMemo, useState } from "react";
import { Bot, Check, ClipboardCheck, Copy, Download, FileText, Lightbulb, Loader2, Plus, Rocket, Send, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CopilotMode } from "@/lib/ai-copilot";
import type { useWorkspaceData } from "./use-workspace-data";

type SuggestedTask = {
  title: string;
  priority: "High" | "Medium" | "Low";
  project: string;
  due: string;
  rationale: string;
};

type CopilotMeta = {
  provider: "gemini" | "local";
  model: string;
  groundedTaskCount: number;
  generatedAt: string;
  fallbackReason?: string;
};

type Evidence = { label: string; value: string };

type Props = {
  tasks: ReturnType<typeof useWorkspaceData>["tasks"];
  addTask: ReturnType<typeof useWorkspaceData>["addTask"];
  workspaceName: string;
};

const modes: Array<{ id: CopilotMode; label: string; description: string; icon: typeof Sparkles }> = [
  { id: "chat", label: "Strategy", description: "Decisions and action plans", icon: Sparkles },
  { id: "prd", label: "PRD", description: "Implementation-ready spec", icon: FileText },
  { id: "pitch", label: "Pitch", description: "Evidence-led investor story", icon: Rocket },
  { id: "tasks_summary", label: "Sprint brief", description: "Grounded task analysis", icon: Zap },
];

const quickPrompts: Record<Exclude<CopilotMode, "tasks_summary">, string[]> = {
  chat: ["Build a 30-day activation plan", "How should we prioritize our next release?", "Identify the riskiest assumption in our product strategy"],
  prd: ["Proximity audio for small team huddles", "Workspace onboarding and activation", "AI meeting notes with reviewed action items"],
  pitch: ["Orbit Spatial OS", "Create an investor narrative for our next fundraising meeting"],
};

export function AIAssistantPanel({ tasks, addTask, workspaceName }: Props) {
  const [mode, setMode] = useState<CopilotMode>("chat");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low">("medium");
  const [meta, setMeta] = useState<CopilotMeta | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<SuggestedTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [addedTasksCount, setAddedTasksCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const openTaskCount = tasks.filter((task) => task.status !== "Done").length;
  const selectedCount = selectedTasks.size;
  const activeMode = modes.find((item) => item.id === mode) || modes[0];

  const resetResult = () => {
    setOutput(null);
    setSummary(null);
    setEvidence([]);
    setGeneratedTasks([]);
    setSelectedTasks(new Set());
    setMeta(null);
    setError(null);
    setAddedTasksCount(0);
  };

  const selectMode = (nextMode: CopilotMode) => {
    setMode(nextMode);
    setPrompt("");
    resetResult();
    if (nextMode === "tasks_summary") void handleGenerate("", nextMode);
  };

  const handleGenerate = async (customPrompt?: string, targetMode?: CopilotMode) => {
    const requestedMode = targetMode || mode;
    const requestedPrompt = customPrompt !== undefined ? customPrompt : prompt;
    if (requestedMode !== "tasks_summary" && !requestedPrompt.trim()) {
      setError("Add a goal, feature, company, or decision before generating.");
      return;
    }
    setLoading(true);
    setError(null);
    setCopied(false);
    setAddedTasksCount(0);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: requestedMode, prompt: requestedPrompt, tasks, workspaceName }),
      });
      const data = await response.json() as {
        success?: boolean;
        error?: string;
        result?: string;
        summary?: string;
        tasksToCreate?: SuggestedTask[];
        evidence?: Evidence[];
        confidence?: "high" | "medium" | "low";
        meta?: CopilotMeta;
      };
      if (!response.ok || !data.success || !data.result) throw new Error(data.error || "Copilot could not generate a response.");
      const suggestions = data.tasksToCreate || [];
      setOutput(data.result);
      setSummary(data.summary || null);
      setEvidence(data.evidence || []);
      setConfidence(data.confidence || "medium");
      setMeta(data.meta || null);
      setGeneratedTasks(suggestions);
      setSelectedTasks(new Set(suggestions.map((_, index) => index)));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to connect to Copilot.");
    } finally {
      setLoading(false);
    }
  };

  const usePrompt = (value: string) => {
    setPrompt(value);
    void handleGenerate(value, mode);
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  const downloadMarkdown = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbit-${mode}-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleTask = (index: number) => setSelectedTasks((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  const handleAddTasksToKanban = () => {
    const approved = generatedTasks.filter((_, index) => selectedTasks.has(index));
    approved.forEach((task) => addTask({ title: task.title, priority: task.priority, project: task.project, due: task.due, status: "Todo" }));
    setAddedTasksCount(approved.length);
    setGeneratedTasks([]);
    setSelectedTasks(new Set());
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[22px] bg-[#173f2b] text-white">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#c8f560] text-[#173f2b]"><Bot size={23} /></div>
            <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">Orbit Copilot</h3><Badge className="bg-white/10 text-[#c8f560]">Professional workspace intelligence</Badge></div><p className="mt-1 max-w-xl text-sm leading-6 text-white/65">Turn workspace context into decisions, product specifications, investor narratives, and reviewed execution plans.</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/[.07] px-3 py-2 text-xs text-white/70"><ShieldCheck size={16} className="text-[#c8f560]" /><span>Review required before any action</span></div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 px-5 py-3 text-xs text-white/55"><span><strong className="text-white">{workspaceName}</strong> context</span><span>{tasks.length} tasks analyzed</span><span>{openTaskCount} open</span><span>No automatic workspace changes</span></div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((item) => <button key={item.id} onClick={() => selectMode(item.id)} aria-pressed={mode === item.id} className={`rounded-2xl border p-3 text-left transition ${mode === item.id ? "border-[#173f2b] bg-[#173f2b] text-white shadow-md" : "border-black/[.08] bg-white hover:border-[#5e8a70]"}`}><div className="flex items-center gap-2 text-sm font-bold"><item.icon size={16} className={mode === item.id ? "text-[#c8f560]" : "text-[#397455]"} />{item.label}</div><div className={`mt-1 text-xs ${mode === item.id ? "text-white/60" : "text-[#68736b]"}`}>{item.description}</div></button>)}
      </div>

      {mode !== "tasks_summary" && <section className="rounded-[20px] border border-black/[.08] bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div><label htmlFor="copilot-prompt" className="text-sm font-bold">What outcome do you need?</label><p className="mt-0.5 text-xs text-[#68736b]">Give Copilot the decision, feature, or company context—not just a topic.</p></div><Badge className="hidden bg-[#edf3e7] text-[#315e45] sm:inline-flex">{activeMode.label}</Badge></div>
        <textarea id="copilot-prompt" rows={3} className="mt-3 w-full resize-none rounded-2xl border border-black/10 bg-[#fbfaf5] p-3 text-sm leading-6 outline-none transition focus:border-[#4b7a5e]" placeholder={mode === "prd" ? "Describe the feature, target user, problem, and constraints…" : mode === "pitch" ? "Enter the company and the investor narrative you need…" : "Describe the decision, objective, and any constraints…"} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void handleGenerate(); }} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1.5">{quickPrompts[mode].map((suggestion) => <button key={suggestion} onClick={() => usePrompt(suggestion)} className="rounded-lg border border-black/[.08] bg-[#f6f5ef] px-2.5 py-1.5 text-xs font-medium text-[#405047] hover:border-[#6f9a80] hover:bg-[#edf3e7]">{suggestion}</button>)}</div><Button onClick={() => void handleGenerate()} disabled={loading || !prompt.trim()}>{loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />} Generate</Button></div>
        <p className="mt-2 text-right text-[10px] text-[#89928c]">Press ⌘/Ctrl + Enter to generate</p>
      </section>}

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Copilot needs attention.</strong> {error}</div>}

      {loading ? <LoadingState mode={activeMode.label} /> : output ? <>
        <section className="overflow-hidden rounded-[22px] border border-black/[.08] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[.07] bg-[#f8f7f1] p-4"><div><div className="flex flex-wrap items-center gap-2"><Badge className={meta?.provider === "gemini" ? "bg-[#dff2e5] text-[#24603c]" : "bg-[#eceae2] text-[#59635d]"}>{meta?.provider === "gemini" ? "Gemini live" : "Professional local mode"}</Badge><Badge className="bg-white text-[#59635d]">{confidence} confidence</Badge></div>{summary && <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#33433a]">{summary}</p>}</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void handleCopy()}>{copied ? <Check size={15} className="text-green-700" /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}</Button><Button variant="outline" size="sm" onClick={downloadMarkdown}><Download size={15} /> Markdown</Button></div></div>
          {meta?.fallbackReason && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">{meta.fallbackReason}</div>}
          <div className="max-h-[52vh] overflow-auto p-5"><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#26342c]">{output}</pre></div>
        </section>

        {evidence.length > 0 && <section className="rounded-[20px] border border-black/[.07] bg-[#edf3e7] p-4"><div className="flex items-center gap-2 text-sm font-bold"><Target size={16} className="text-[#397455]" /> Context used</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{evidence.map((item) => <div key={`${item.label}-${item.value}`} className="rounded-xl bg-white/75 p-3"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6d7a71]">{item.label}</div><div className="mt-1 text-xs font-medium text-[#33443a]">{item.value}</div></div>)}</div><p className="mt-3 text-[10px] text-[#718077]">Workspace records are treated as data, not instructions. Verify assumptions before making high-impact decisions.</p></section>}

        {generatedTasks.length > 0 && <section className="rounded-[22px] border border-black/[.08] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-bold"><ClipboardCheck size={17} className="text-[#397455]" /> Review suggested tasks</div><p className="mt-1 text-xs text-[#68736b]">Only selected tasks will be added. Nothing happens until you confirm.</p></div><Badge className="bg-[#edf3e7] text-[#315e45]">{selectedCount} of {generatedTasks.length} selected</Badge></div><div className="mt-4 space-y-2">{generatedTasks.map((task, index) => <label key={`${task.title}-${index}`} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${selectedTasks.has(index) ? "border-[#75a187] bg-[#f2f7ee]" : "border-black/[.07] bg-[#fbfaf6] opacity-70"}`}><input type="checkbox" className="mt-1 h-4 w-4 accent-[#173f2b]" checked={selectedTasks.has(index)} onChange={() => toggleTask(index)} aria-label={`Select ${task.title}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{task.title}</span><Badge className={task.priority === "High" ? "bg-[#ffe1d4] text-[#843d28]" : task.priority === "Medium" ? "bg-[#fff0c9] text-[#765917]" : "bg-black/5 text-[#59635d]"}>{task.priority}</Badge></div><p className="mt-1 text-xs leading-5 text-[#68736b]">{task.rationale}</p><div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-wide text-[#758078]"><span>{task.project}</span><span>{task.due}</span></div></div></label>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-md text-xs text-[#68736b]">Review titles, priority, scope, and timing. You remain accountable for every created task.</p><Button onClick={handleAddTasksToKanban} disabled={selectedCount === 0}><Plus size={16} /> Add {selectedCount} selected task{selectedCount === 1 ? "" : "s"}</Button></div></section>}

        {addedTasksCount > 0 && <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800"><Check size={17} /> Added {addedTasksCount} reviewed task{addedTasksCount === 1 ? "" : "s"} to My tasks.</div>}
      </> : <EmptyState mode={activeMode.label} />}
    </div>
  );
}

function LoadingState({ mode }: { mode: string }) {
  return <div className="flex min-h-64 items-center justify-center rounded-[22px] border border-black/[.08] bg-white p-8 text-center"><div><div className="relative mx-auto h-14 w-14"><div className="absolute inset-0 animate-ping rounded-2xl bg-[#c8f560]/35" /><div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-[#173f2b] text-[#c8f560]"><Loader2 className="animate-spin" size={24} /></div></div><div className="mt-4 font-bold">Building your {mode.toLowerCase()}</div><p className="mt-1 text-sm text-[#68736b]">Analyzing workspace context, checking assumptions, and structuring the response…</p></div></div>;
}

function EmptyState({ mode }: { mode: string }) {
  const points = useMemo(() => mode === "PRD" ? ["Goals and non-goals", "Acceptance criteria", "Measurement and rollout"] : mode === "Pitch" ? ["Evidence-led narrative", "No fabricated metrics", "Investor readiness checklist"] : ["Explicit assumptions", "Options and trade-offs", "Measurable next actions"], [mode]);
  return <div className="rounded-[22px] border border-dashed border-black/15 bg-white/45 p-7 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e4efdc] text-[#397455]"><Lightbulb size={21} /></div><h3 className="mt-4 font-bold">Professional {mode.toLowerCase()} output</h3><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-[#68736b]">Copilot will use the current workspace context, separate evidence from assumptions, and leave every proposed action under your control.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{points.map((point) => <span key={point} className="rounded-full border border-black/[.07] bg-white px-3 py-1.5 text-xs font-semibold text-[#526159]">{point}</span>)}</div></div>;
}
