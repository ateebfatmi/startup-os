import type { RealtimeChannel } from "@supabase/supabase-js";
import { io, Socket } from "socket.io-client";
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
  private readonly handleStorage = (event: StorageEvent) => {
    if (event.key !== this.storageKey || !event.newValue || !this.events) return;
    try {
      const envelope = JSON.parse(event.newValue) as { message?: Partial<BrowserMessage> };
      if (envelope.message?.type === "leave" && typeof envelope.message.playerId === "string") {
        this.events.onLeave(envelope.message.playerId);
      }
    } catch {
      // Ignore malformed events from unrelated scripts on the same origin.
    }
  };

  constructor(private readonly workspaceId: string) {}

  private get storageKey() { return `crewvilla-presence-event:${this.workspaceId}`; }

  async connect(events: MultiplayerEvents) {
    this.events = events;
    events.onState("connecting", "Local network");
    if (typeof BroadcastChannel === "undefined") {
      events.onState("offline", "This browser does not support local presence");
      return;
    }
    this.channel = new BroadcastChannel(`crewvilla:${this.workspaceId}`);
    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("storage", this.handleStorage);
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
    window.removeEventListener("storage", this.handleStorage);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.channel?.close();
    this.channel = null;
    this.events?.onState("offline", "Local network");
  }

  private post(message: BrowserMessage) {
    this.channel?.postMessage(message);
    if (message.type === "leave") {
      window.localStorage.setItem(this.storageKey, JSON.stringify({ nonce: crypto.randomUUID(), message }));
    }
  }
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
      config: { private: true, presence: { key: this.playerId }, broadcast: { self: false, ack: false } },
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

export class SocketIOMultiplayerTransport implements MultiplayerTransport {
  private socket: Socket | null = null;
  private events: MultiplayerEvents | null = null;
  private latest: PlayerSnapshot | null = null;

  constructor(
    private readonly workspaceId: string,
    private readonly playerId: string,
    private readonly serverUrl: string = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4001"
  ) {}

  async connect(events: MultiplayerEvents) {
    this.events = events;
    events.onState("connecting", "Socket.IO Multiplayer");

    this.socket = io(this.serverUrl, {
      query: {
        workspaceId: this.workspaceId,
        userId: this.playerId,
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    this.socket.on("connect", () => {
      this.events?.onState("connected", "Socket.IO Multiplayer");
      if (this.latest) {
        this.socket?.emit("player:move", this.latest);
      }
    });

    this.socket.on("room:players", (players: PlayerSnapshot[]) => {
      for (const p of players) {
        if (p.id !== this.playerId && isPlayerSnapshot(p)) {
          this.events?.onPlayer(normalizeSnapshot(p));
        }
      }
    });

    this.socket.on("player:joined", (player: PlayerSnapshot) => {
      if (player.id !== this.playerId && isPlayerSnapshot(player)) {
        this.events?.onPlayer(normalizeSnapshot(player));
      }
    });

    this.socket.on("player:moved", (player: PlayerSnapshot) => {
      if (player.id !== this.playerId && isPlayerSnapshot(player)) {
        this.events?.onPlayer(normalizeSnapshot(player));
      }
    });

    this.socket.on("player:left", (playerId: string) => {
      this.events?.onLeave(playerId);
    });

    this.socket.on("connect_error", () => {
      this.events?.onState("reconnecting", "Socket.IO Multiplayer");
    });

    this.socket.on("disconnect", () => {
      this.events?.onState("offline", "Socket.IO Multiplayer");
    });
  }

  async publish(snapshot: PlayerSnapshot) {
    this.latest = normalizeSnapshot(snapshot);
    if (!this.socket?.connected) return;
    this.socket.emit("player:move", this.latest);
  }

  async disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.events?.onState("offline", "Socket.IO Multiplayer");
  }
}

export function createTransport(workspaceId: string, playerId: string): MultiplayerTransport {
  if (process.env.NEXT_PUBLIC_REALTIME_URL) {
    return new SocketIOMultiplayerTransport(workspaceId, playerId);
  }
  return hasSupabaseConfig ? new SupabaseRealtimeTransport(workspaceId, playerId) : new BrowserChannelTransport(workspaceId);
}
