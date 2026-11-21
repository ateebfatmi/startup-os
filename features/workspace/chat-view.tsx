"use client";

import { useState } from "react";
import { Hash, Lock, Send, Smile, Paperclip, MessageSquare, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatChannel, ChatMessage } from "./messaging-types";

const INITIAL_CHANNELS: ChatChannel[] = [
  { id: "c-general", workspaceId: "demo", name: "general", description: "Company-wide startup announcements and updates", isPrivate: false },
  { id: "c-engineering", workspaceId: "demo", name: "engineering", description: "Architecture, sprints, and code reviews", isPrivate: false },
  { id: "c-design", workspaceId: "demo", name: "design", description: "Design system, Figma explorations, and UI specs", isPrivate: false },
  { id: "c-founders", workspaceId: "demo", name: "founders", description: "Strategy, investor updates, and board meetings", isPrivate: true },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m-1",
    workspaceId: "demo",
    channelId: "c-general",
    senderId: "dev-alex",
    senderName: "Alex Mercer",
    content: "Welcome to CrewVilla Virtual Office! 🚀 Check out the 3D office and grab a desk in engineering.",
    createdAt: Date.now() - 3600000,
  },
  {
    id: "m-2",
    workspaceId: "demo",
    channelId: "c-general",
    senderId: "design-maya",
    senderName: "Maya Lin",
    content: "Just updated the biophilic lounge styling in the Office Design studio. Let me know what you think!",
    createdAt: Date.now() - 1800000,
  },
];

export function ChatView({
  workspaceId,
  displayName,
}: {
  workspaceId: string;
  displayName: string;
}) {
  const [channels] = useState<ChatChannel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>("c-general");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputContent, setInputContent] = useState("");

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannelId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      workspaceId,
      channelId: activeChannelId,
      senderId: "local-user",
      senderName: displayName || "You",
      content: inputContent.trim(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputContent("");
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-3xl border border-black/10 bg-[#fffdf7] overflow-hidden shadow-sm m-4">
      {/* Channels Sidebar */}
      <div className="w-64 border-r border-black/10 bg-[#f7f5ee] flex flex-col">
        <div className="p-4 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-[#17211b]">
            <MessageSquare size={16} className="text-[#173f2b]" />
            <span>Team Channels</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#68736b] uppercase tracking-wider">
            Channels
          </div>
          {channels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  isActive
                    ? "bg-[#173f2b] text-[#c8f560]"
                    : "text-[#17211b] hover:bg-black/5"
                }`}
              >
                {channel.isPrivate ? <Lock size={14} /> : <Hash size={14} />}
                <span className="truncate">{channel.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeChannel.isPrivate ? <Lock size={16} className="text-[#68736b]" /> : <Hash size={16} className="text-[#68736b]" />}
            <span className="font-bold text-sm text-[#17211b]">{activeChannel.name}</span>
            {activeChannel.description && (
              <span className="text-xs text-[#68736b] hidden sm:inline border-l border-black/10 pl-2 ml-1">
                {activeChannel.description}
              </span>
            )}
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {channelMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 group">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-[#173f2b] text-[#c8f560] font-bold grid place-items-center text-xs">
                {msg.senderName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#17211b]">{msg.senderName}</span>
                  <span className="text-[10px] text-[#68736b]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#2c3830] leading-relaxed break-words">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="p-3 border-t border-black/10 flex items-center gap-2 bg-[#fffdf7]">
          <input
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={`Message #${activeChannel.name}…`}
            className="flex-1 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-[#17211b] focus:border-[#173f2b] focus:outline-none shadow-xs"
          />
          <Button
            type="submit"
            disabled={!inputContent.trim()}
            className="bg-[#173f2b] text-[#c8f560] hover:bg-[#102f21] px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
          >
            <Send size={15} />
          </Button>
        </form>
      </div>
    </div>
  );
}
