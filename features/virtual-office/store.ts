"use client";

import { create } from "zustand";
import type { InteractionKind, PlayerSnapshot } from "./types";

type OfficeState = {
  player: PlayerSnapshot;
  nearbyAction: { kind: InteractionKind; label: string } | null;
  activePanel: InteractionKind | null;
  setPlayerTransform: (x: number, z: number, rotation: number) => void;
  setNearbyAction: (action: OfficeState["nearbyAction"]) => void;
  openPanel: (panel: InteractionKind) => void;
  closePanel: () => void;
};

export const useOfficeStore = create<OfficeState>((set) => ({
  player: { id: "local", name: "You", x: 0, z: 1.6, rotation: Math.PI, updatedAt: Date.now(), color: "#ff8a4c" },
  nearbyAction: null,
  activePanel: null,
  setPlayerTransform: (x, z, rotation) => set((state) => ({ player: { ...state.player, x, z, rotation, updatedAt: Date.now() } })),
  setNearbyAction: (nearbyAction) => set({ nearbyAction }),
  openPanel: (activePanel) => set({ activePanel }),
  closePanel: () => set({ activePanel: null }),
}));
