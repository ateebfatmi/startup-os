"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, X, Terminal, Palette, TrendingUp, Check } from "lucide-react";
import { useOfficeStore } from "./store";
import { AI_TEAMMATES } from "./ai-teammates";
import { playChime } from "./audio";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function AITeammateDialog() {
  const activeTeammate = useOfficeStore((state) => state.activeAITeammate);
  const closeAITeammate = useOfficeStore((state) => state.closeAITeammate);
  const config = activeTeammate ? AI_TEAMMATES[activeTeammate] : null;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    dev: [
      {
        role: "assistant",
        content: "Hey! I'm **Alex**, your Lead AI Architect. I'm currently monitoring our WebRTC mesh network and checking our latest PRs. What can I build or optimize for you today?",
        timestamp: "Just now",
      },
    ],
    design: [
      {
        role: "assistant",
        content: "Hello! I'm **Maya**, Principal AI Designer. I'm reviewing our spatial office layouts and UX onboarding flows. Want to review wireframes, refine our visual design system, or discuss user feedback?",
        timestamp: "Just now",
      },
    ],
    finance: [
      {
        role: "assistant",
        content: "Hi! I'm **Marcus**, your AI CFO. I've updated our metrics: **$48.2K MRR**, **$14.5K/mo burn rate**, giving us **18.4 months of runway**. How can I help with financial modeling or investor updates?",
        timestamp: "Just now",
      },
    ],
  });

  if (!config) return null;

  const currentMessages = messages[config.id] || [];

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: "Just now",
    };

    setMessages((prev) => ({
      ...prev,
      [config.id]: [...(prev[config.id] || []), userMsg],
    }));
    setInput("");
    setLoading(true);

    // Contextual responses tailored to each teammate's persona
    setTimeout(() => {
      let reply = "";
      if (config.id === "dev") {
        if (query.toLowerCase().includes("pr") || query.toLowerCase().includes("pull request") || query.toLowerCase().includes("commit")) {
          reply = `Here is my assessment of the open pull requests:\n\n1. **#42 - WebRTC DataChannel packet retry optimization**: Looks solid. Verified 18ms latency with zero frame drop.\n2. **#43 - Spatial audio distance attenuation**: Approved. Great curve falloff.\n\nRecommendation: Safe to merge both directly to \`main\`. Would you like me to trigger the deploy pipeline?`;
        } else if (query.toLowerCase().includes("webrtc") || query.toLowerCase().includes("mesh")) {
          reply = `Our WebRTC topology uses a full mesh for up to 8 peers with automatic P2P signaling fallback via Supabase Broadcast channels. Latency is running at **18ms** across all active nodes with sub-50ms peer discovery.`;
        } else {
          reply = `I've analyzed that from a systems perspective. Here's how we should implement it:\n\n\`\`\`typescript\n// Optimized async handler with backoff\nexport async function handleSync() {\n  const res = await fetch('/api/workspace/sync', { cache: 'no-store' });\n  return res.json();\n}\n\`\`\`\n\nI can scaffold the unit tests and deploy this cleanly whenever you're ready.`;
        }
      } else if (config.id === "design") {
        if (query.toLowerCase().includes("onboarding") || query.toLowerCase().includes("ux")) {
          reply = `For our onboarding experience, I suggest a 3-step progressive disclosure:\n\n1. **Avatar Customization**: Pick hoodie color in <10 seconds.\n2. **Walk to Desk**: Interactive WASD trail pointing directly to their assigned seat.\n3. **First Huddle**: One-click audio join toast.\n\nThis keeps time-to-first-collaboration under 45 seconds!`;
        } else {
          reply = `Great point. In modern spatial software like Linear and Gather, the key is high information density with zero visual noise. I've logged this in our design backlog and can prepare Figma specs for this layout.`;
        }
      } else {
        if (query.toLowerCase().includes("runway") || query.toLowerCase().includes("burn")) {
          reply = `Here is our current financial snapshot:\n\n- **Monthly Recurring Revenue (MRR)**: $48,200 (+18% MoM)\n- **Gross Burn Rate**: $14,500 / month\n- **Cash in Bank**: $266,800\n- **Effective Runway**: **18.4 Months**\n\nWe are in a healthy position to open our $1.5M Seed round on favorable terms.`;
        } else {
          reply = `From a venture capital lens, top seed investors (Founders Fund, Sequoia, YC) look for 3 key metrics right now: MoM organic expansion, net retention >120%, and founder capital efficiency. We are pacing above the 75th percentile on all three.`;
        }
      }

      const aiMsg: Message = {
        role: "assistant",
        content: reply,
        timestamp: "Just now",
      };

      setMessages((prev) => ({
        ...prev,
        [config.id]: [...(prev[config.id] || []), aiMsg],
      }));
      setLoading(false);
      playChime();
    }, 700);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-black/10 bg-[#fffdf7] shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: config.color }}
          >
            {config.id === "dev" ? (
              <Terminal size={20} />
            ) : config.id === "design" ? (
              <Palette size={20} />
            ) : (
              <TrendingUp size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#17211b]">{config.name}</h2>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider"
                style={{ backgroundColor: config.accent }}
              >
                AI {config.id}
              </span>
            </div>
            <p className="text-xs text-[#68736b]">{config.role} · {config.department}</p>
          </div>
        </div>
        <button
          onClick={closeAITeammate}
          className="rounded-lg p-1.5 text-[#68736b] hover:bg-black/5 hover:text-[#17211b]"
        >
          <X size={18} />
        </button>
      </div>

      {/* Suggested Quick Questions */}
      <div className="border-b border-black/[0.06] bg-[#f9f6ee] p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#68736b]">
          Quick Startup Questions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {config.suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-[#2d3a33] shadow-2xs hover:border-[#173f2b] hover:bg-black/5 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                msg.role === "user"
                  ? "bg-[#173f2b] text-white rounded-br-xs"
                  : "border border-black/10 bg-white text-[#1f2d26] rounded-bl-xs"
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
            </div>
            <span className="mt-1 px-1 text-[9px] text-[#8c968f]">{msg.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 rounded-xl bg-white border border-black/10 px-3 py-2 text-xs text-[#68736b] w-fit shadow-xs">
            <Sparkles size={14} className="animate-spin text-[#c8f560]" />
            <span>{config.name} is thinking…</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-black/10 p-3 bg-white"
      >
        <div className="flex items-center gap-2 rounded-xl border border-black/15 bg-[#fbf9f4] px-3 py-2 focus-within:border-[#173f2b] focus-within:ring-1 focus-within:ring-[#173f2b]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${config.name} a question…`}
            className="w-full bg-transparent text-xs text-[#17211b] outline-none placeholder:text-[#8c968f]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#173f2b] text-white transition disabled:opacity-40 hover:bg-[#23583c]"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}
