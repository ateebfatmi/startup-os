import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type { ConnectionState, PlayerSnapshot } from "@/features/virtual-office/types";
import { isPlayerSnapshot, normalizeSnapshot } from "./protocol";

export type MultiplayerEvents = {
  onPlayer: (player: PlayerSnapshot) => void;
  onLeave: (playerId: string) => void;
  onState: (state: ConnectionState, label: string) => void;
};

export interface MultiplayerTransport {
  connect(events: MultiplayerEvents): Promise<void>;
  publish(snapshot: PlayerSnapshot): Promise<void>;
  disconnect(): Promise<void>;
}

type BrowserMessage =
  | { type: "join" | "snapshot" | "heartbeat"; player: PlayerSnapshot }
  | { type: "leave"; playerId: string };

export class BrowserChannelTransport implements MultiplayerTransport {
  private channel: BroadcastChannel | null = null;
  private events: MultiplayerEvents | null = null;
  private latest: PlayerSnapshot | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private readonly handlePageHide = () => {
    if (this.latest) this.post({ type: "leave", playerId: this.latest.id });
  };

  constructor(private readonly workspaceId: string) {}

  async connect(events: MultiplayerEvents) {
    this.events = events;
    events.onState("connecting", "Local network");
    if (typeof BroadcastChannel === "undefined") {
      events.onState("offline", "This browser does not support local presence");
      return;
    }
    this.channel = new BroadcastChannel(`orbit:${this.workspaceId}`);
    window.addEventListener("pagehide", this.handlePageHide);
    this.channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data as Partial<BrowserMessage>;
      if ((message.type === "join" || message.type === "snapshot" || message.type === "heartbeat") && isPlayerSnapshot(message.player)) {
        events.onPlayer(normalizeSnapshot(message.player));
        if (message.type === "join" && this.latest) this.post({ type: "snapshot", player: this.latest });
      }
      if (message.type === "leave" && typeof message.playerId === "string") events.onLeave(message.playerId);
    };
    this.heartbeat = setInterval(() => { if (this.latest) this.post({ type: "heartbeat", player: { ...this.latest, updatedAt: Date.now() } }); }, 5_000);
    events.onState("connected", "Local network");
  }

  async publish(snapshot: PlayerSnapshot) {
    this.latest = normalizeSnapshot(snapshot);
    this.post({ type: "snapshot", player: this.latest });
  }

  async disconnect() {
    if (this.latest) this.post({ type: "leave", playerId: this.latest.id });
    window.removeEventListener("pagehide", this.handlePageHide);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.channel?.close();
    this.channel = null;
    this.events?.onState("offline", "Local network");
  }

  private post(message: BrowserMessage) { this.channel?.postMessage(message); }
}

export class SupabaseRealtimeTransport implements MultiplayerTransport {
  private channel: RealtimeChannel | null = null;
  private events: MultiplayerEvents | null = null;
  private latest: PlayerSnapshot | null = null;

  constructor(private readonly workspaceId: string, private readonly playerId: string) {}

  async connect(events: MultiplayerEvents) {
    this.events = events;
    events.onState("connecting", "Supabase Realtime");
    const supabase = createSupabaseBrowserClient();
    this.channel = supabase.channel(`workspace:${this.workspaceId}`, {
      config: { presence: { key: this.playerId }, broadcast: { self: false, ack: false } },
    });
    this.channel
      .on("broadcast", { event: "player-transform" }, ({ payload }) => {
        if (isPlayerSnapshot(payload)) events.onPlayer(normalizeSnapshot(payload));
      })
      .on("presence", { event: "leave" }, ({ key }) => { if (key) events.onLeave(key); })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          events.onState("connected", "Supabase Realtime");
          if (this.latest) await this.channel?.track(this.latest);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          events.onState("reconnecting", "Supabase Realtime");
        } else if (status === "CLOSED") events.onState("offline", "Supabase Realtime");
      });
  }

  async publish(snapshot: PlayerSnapshot) {
    this.latest = normalizeSnapshot(snapshot);
    if (!this.channel) return;
    await Promise.all([
      this.channel.send({ type: "broadcast", event: "player-transform", payload: this.latest }),
      this.channel.track(this.latest),
    ]);
  }

  async disconnect() {
    await this.channel?.untrack();
    await this.channel?.unsubscribe();
    this.channel = null;
    this.events?.onState("offline", "Supabase Realtime");
  }
}

export function createTransport(workspaceId: string, playerId: string): MultiplayerTransport {
  return hasSupabaseConfig ? new SupabaseRealtimeTransport(workspaceId, playerId) : new BrowserChannelTransport(workspaceId);
}
