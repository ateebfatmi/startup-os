"use client";

import { create } from "zustand";
import type { ConnectionState, InteractionKind, PlayerSnapshot } from "./types";

type OfficeState = {
  player: PlayerSnapshot;
  remotePlayers: Record<string, PlayerSnapshot>;
  connectionState: ConnectionState;
  transportLabel: string;
  nearbyAction: { kind: InteractionKind; label: string } | null;
  activePanel: InteractionKind | null;
  setPlayerTransform: (x: number, z: number, rotation: number) => void;
  setPlayerIdentity: (identity: Pick<PlayerSnapshot, "id" | "name" | "color">) => void;
  upsertRemotePlayer: (player: PlayerSnapshot) => void;
  removeRemotePlayer: (id: string) => void;
  pruneRemotePlayers: (olderThan: number) => void;
  setConnectionState: (state: ConnectionState, transportLabel?: string) => void;
  setNearbyAction: (action: OfficeState["nearbyAction"]) => void;
  openPanel: (panel: InteractionKind) => void;
  closePanel: () => void;
};

export const useOfficeStore = create<OfficeState>((set) => ({
  player: { id: "local", name: "You", x: 0, z: 1.6, rotation: Math.PI, updatedAt: Date.now(), color: "#ff8a4c" },
  remotePlayers: {},
  connectionState: "connecting",
  transportLabel: "Local network",
  nearbyAction: null,
  activePanel: null,
  setPlayerTransform: (x, z, rotation) => set((state) => ({ player: { ...state.player, x, z, rotation, updatedAt: Date.now() } })),
  setPlayerIdentity: (identity) => set((state) => ({ player: { ...state.player, ...identity } })),
  upsertRemotePlayer: (player) => set((state) => player.id === state.player.id ? state : ({ remotePlayers: { ...state.remotePlayers, [player.id]: player } })),
  removeRemotePlayer: (id) => set((state) => {
    const remotePlayers = { ...state.remotePlayers };
    delete remotePlayers[id];
    return { remotePlayers };
  }),
  pruneRemotePlayers: (olderThan) => set((state) => ({ remotePlayers: Object.fromEntries(Object.entries(state.remotePlayers).filter(([, player]) => player.updatedAt >= olderThan)) })),
  setConnectionState: (connectionState, transportLabel) => set((state) => ({ connectionState, transportLabel: transportLabel ?? state.transportLabel })),
  setNearbyAction: (nearbyAction) => set({ nearbyAction }),
  openPanel: (activePanel) => set({ activePanel }),
  closePanel: () => set({ activePanel: null }),
}));
