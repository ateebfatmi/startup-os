import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type { SignalMessage } from "./types";

export interface SignalingTransport {
  connect(onMessage: (message: SignalMessage) => void): Promise<void>;
  send(message: SignalMessage): Promise<void>;
  disconnect(): Promise<void>;
}

export function isSignalMessage(value: unknown): value is SignalMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<SignalMessage>;
  return typeof message.roomId === "string" && typeof message.sourceId === "string" && typeof message.sourceName === "string" && ["join", "present", "offer", "answer", "ice", "media-state", "leave"].includes(message.type ?? "");
}

class BrowserSignalingTransport implements SignalingTransport {
  private channel: BroadcastChannel | null = null;
  constructor(private readonly workspaceId: string, private readonly roomId: string) {}
  async connect(onMessage: (message: SignalMessage) => void) {
    if (typeof BroadcastChannel === "undefined") throw new Error("This browser does not support local call signaling.");
    this.channel = new BroadcastChannel(`orbit-call:${this.workspaceId}:${this.roomId}`);
    this.channel.onmessage = (event: MessageEvent<unknown>) => { if (isSignalMessage(event.data)) onMessage(event.data); };
  }
  async send(message: SignalMessage) { this.channel?.postMessage(message); }
  async disconnect() { this.channel?.close(); this.channel = null; }
}

class SupabaseSignalingTransport implements SignalingTransport {
  private channel: RealtimeChannel | null = null;
  constructor(private readonly workspaceId: string, private readonly roomId: string) {}
  async connect(onMessage: (message: SignalMessage) => void) {
    const supabase = createSupabaseBrowserClient();
    this.channel = supabase.channel(`call:${this.workspaceId}:${this.roomId}`, { config: { broadcast: { self: false, ack: false } } });
    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => { if (isSignalMessage(payload)) onMessage(payload); });
    await new Promise<void>((resolve, reject) => {
      this.channel?.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error("Could not connect to call signaling."));
      });
    });
  }
  async send(message: SignalMessage) { await this.channel?.send({ type: "broadcast", event: "signal", payload: message }); }
  async disconnect() { await this.channel?.unsubscribe(); this.channel = null; }
}

export function createSignalingTransport(workspaceId: string, roomId: string): SignalingTransport {
  return hasSupabaseConfig ? new SupabaseSignalingTransport(workspaceId, roomId) : new BrowserSignalingTransport(workspaceId, roomId);
}
