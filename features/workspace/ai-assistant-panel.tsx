"use client";

import { useState } from "react";
import { Bot, Check, Copy, FileText, Lightbulb, Loader2, Plus, Rocket, Send, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { useWorkspaceData } from "./use-workspace-data";

type Mode = "chat" | "prd" | "pitch" | "tasks_summary";

type Props = {
  tasks: ReturnType<typeof useWorkspaceData>["tasks"];
  addTask: ReturnType<typeof useWorkspaceData>["addTask"];
};

export function AIAssistantPanel({ tasks, addTask }: Props) {
  const [mode, setMode] = useState<Mode>("chat");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<{ title: string; priority: "High" | "Medium" | "Low"; project: string; due: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [addedTasksCount, setAddedTasksCount] = useState(0);

  const handleGenerate = async (customPrompt?: string, targetMode?: Mode) => {
    const activeMode = targetMode || mode;
    const activePrompt = customPrompt !== undefined ? customPrompt : prompt;
    setLoading(true);
    setCopied(false);
    setAddedTasksCount(0);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: activeMode, prompt: activePrompt, tasks }),
      });
      const data = await res.json();
      if (data.success) {
        setOutput(data.result);
        setGeneratedTasks(data.tasksToCreate || []);
      } else {
        setOutput("An error occurred while generating. Please try again.");
      }
    } catch {
      setOutput("Unable to connect to AI server. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddTasksToKanban = () => {
    if (!generatedTasks.length) return;
    generatedTasks.forEach((t) => {
      addTask({
        title: t.title,
        priority: t.priority,
        project: t.project,
        due: t.due,
        status: "In progress",
      });
    });
    setAddedTasksCount(generatedTasks.length);
    setGeneratedTasks([]);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#173f2b] to-[#1e5238] p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#c8f560] text-[#173f2b]">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">AI Startup Copilot</h3>
              <Badge className="bg-[#c8f560]/20 text-[#c8f560]">Spatial AI</Badge>
            </div>
            <p className="text-xs text-white/70">Draft PRDs, generate pitch deck outlines, and summarize sprint tasks instantly.</p>
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          onClick={() => { setMode("chat"); setOutput(null); }}
          className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition ${mode === "chat" ? "bg-[#173f2b] text-[#c8f560]" : "bg-white text-[#68736b] hover:bg-black/5"}`}
        >
          <Sparkles size={15} /> Strategy Q&A
        </button>
        <button
          onClick={() => { setMode("prd"); setOutput(null); }}
          className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition ${mode === "prd" ? "bg-[#173f2b] text-[#c8f560]" : "bg-white text-[#68736b] hover:bg-black/5"}`}
        >
          <FileText size={15} /> PRD Generator
        </button>
        <button
          onClick={() => { setMode("pitch"); setOutput(null); }}
          className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition ${mode === "pitch" ? "bg-[#173f2b] text-[#c8f560]" : "bg-white text-[#68736b] hover:bg-black/5"}`}
        >
          <Rocket size={15} /> Pitch Deck
        </button>
        <button
          onClick={() => { setMode("tasks_summary"); setOutput(null); handleGenerate("", "tasks_summary"); }}
          className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition ${mode === "tasks_summary" ? "bg-[#173f2b] text-[#c8f560]" : "bg-white text-[#68736b] hover:bg-black/5"}`}
        >
          <Zap size={15} /> Sprint Summary
        </button>
      </div>

      {/* Quick Suggestion Chips */}
      {mode !== "tasks_summary" && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68736b]">Quick Prompts</span>
          <div className="flex flex-wrap gap-1.5">
            {mode === "chat" && (
              <>
                <button onClick={() => { setPrompt("How can we increase daily active user retention for Orbit?"); handleGenerate("How can we increase daily active user retention for Orbit?", "chat"); }} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#2d3a32] border border-black/10 hover:border-black/20">
                  💡 User Retention Strategy
                </button>
                <button onClick={() => { setPrompt("What are key technical risks in building WebRTC mesh vs SFU?"); handleGenerate("What are key technical risks in building WebRTC mesh vs SFU?", "chat"); }} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#2d3a32] border border-black/10 hover:border-black/20">
                  ⚡ WebRTC Mesh vs SFU
                </button>
              </>
            )}
            {mode === "prd" && (
              <>
                <button onClick={() => { setPrompt("Spatial Whiteboard & Sticky Notes Synchronization"); handleGenerate("Spatial Whiteboard & Sticky Notes Synchronization", "prd"); }} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#2d3a32] border border-black/10 hover:border-black/20">
                  📄 PRD: Spatial Whiteboard
                </button>
                <button onClick={() => { setPrompt("Automatic Audio Proximity Huddles"); handleGenerate("Automatic Audio Proximity Huddles", "prd"); }} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#2d3a32] border border-black/10 hover:border-black/20">
                  📄 PRD: Audio Proximity
                </button>
              </>
            )}
            {mode === "pitch" && (
              <>
                <button onClick={() => { setPrompt("Orbit Spatial OS"); handleGenerate("Orbit Spatial OS", "pitch"); }} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#2d3a32] border border-black/10 hover:border-black/20">
                  🚀 Orbit Spatial Pitch Deck
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input Form */}
      {mode !== "tasks_summary" && (
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="flex gap-2">
          <input
            type="text"
            className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#173f2b]"
            placeholder={
              mode === "prd"
                ? "Enter feature title or description (e.g. Realtime Spatial Audio)..."
                : mode === "pitch"
                ? "Enter startup name (e.g. Orbit Spatial)..."
                : "Ask any startup, tech, or strategy question..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
            Generate
          </Button>
        </form>
      )}

      {/* Output Display Area */}
      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-black/10 bg-white p-6 text-center">
          <div className="space-y-3">
            <Loader2 className="mx-auto animate-spin text-[#173f2b]" size={32} />
            <p className="text-sm font-semibold text-[#173f2b]">Analyzing workspace context & generating response…</p>
          </div>
        </div>
      ) : output ? (
        <div className="space-y-3">
          <div className="relative max-h-96 overflow-y-auto rounded-2xl border border-black/10 bg-white p-5 text-sm leading-relaxed text-[#1f2923]">
            <pre className="whitespace-pre-wrap font-sans text-sm">{output}</pre>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? "Copied to clipboard" : "Copy output"}
            </Button>

            {generatedTasks.length > 0 && (
              <Button size="sm" className="bg-[#173f2b] text-[#c8f560] hover:bg-[#20573c]" onClick={handleAddTasksToKanban}>
                <Plus size={16} />
                Add {generatedTasks.length} Tasks to Kanban
              </Button>
            )}

            {addedTasksCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-700">
                <Check size={14} /> Added {addedTasksCount} tasks to Kanban board!
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
