"use client";

import { create } from "zustand";
import type { Availability, ConnectionState, InteractionKind, PlayerSnapshot } from "./types";

type OfficeState = {
  player: PlayerSnapshot;
  remotePlayers: Record<string, PlayerSnapshot>;
  connectionState: ConnectionState;
  transportLabel: string;
  nearbyAction: { kind: InteractionKind; label: string } | null;
  activePanel: InteractionKind | null;
  cameraMode: "top" | "follow";
  clickTarget: { x: number; z: number } | null;
  lightingMode: "day" | "sunset" | "night";
  isSitting: boolean;
  isCaffeinated: boolean;
  lofiPlaying: boolean;
  boardroomSlide: number;
  avatarStatus: Availability;
  zoomLevel: number;
  setPlayerTransform: (x: number, z: number, rotation: number) => void;
  setPlayerIdentity: (identity: Pick<PlayerSnapshot, "id" | "name" | "color">) => void;
  upsertRemotePlayer: (player: PlayerSnapshot) => void;
  removeRemotePlayer: (id: string) => void;
  clearRemotePlayers: () => void;
  pruneRemotePlayers: (olderThan: number) => void;
  setConnectionState: (state: ConnectionState, transportLabel?: string) => void;
  setNearbyAction: (action: OfficeState["nearbyAction"]) => void;
  openPanel: (panel: InteractionKind) => void;
  closePanel: () => void;
  setCameraMode: (mode: "top" | "follow") => void;
  toggleCameraMode: () => void;
  setClickTarget: (target: { x: number; z: number } | null) => void;
  setLightingMode: (mode: "day" | "sunset" | "night") => void;
  cycleLightingMode: () => void;
  setIsSitting: (sitting: boolean) => void;
  setIsCaffeinated: (caffeinated: boolean) => void;
  setLofiPlaying: (playing: boolean) => void;
  toggleLofi: () => void;
  nextBoardroomSlide: () => void;
  setAvatarStatus: (status: Availability) => void;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

export const useOfficeStore = create<OfficeState>((set) => ({
  player: { id: "local", name: "You", x: 0, z: 1.6, rotation: Math.PI, updatedAt: Date.now(), color: "#ff8a4c", status: "available" },
  remotePlayers: {},
  connectionState: "connecting",
  transportLabel: "Local network",
  nearbyAction: null,
  activePanel: null,
  cameraMode: "top",
  clickTarget: null,
  lightingMode: "day",
  isSitting: false,
  isCaffeinated: false,
  lofiPlaying: false,
  boardroomSlide: 0,
  avatarStatus: "available",
  zoomLevel: 1.0,
  setPlayerTransform: (x, z, rotation) => set((state) => ({ player: { ...state.player, x, z, rotation, updatedAt: Date.now() } })),
  setPlayerIdentity: (identity) => set((state) => ({ player: { ...state.player, ...identity } })),
  upsertRemotePlayer: (player) => set((state) => player.id === state.player.id ? state : ({ remotePlayers: { ...state.remotePlayers, [player.id]: player } })),
  removeRemotePlayer: (id) => set((state) => {
    const remotePlayers = { ...state.remotePlayers };
    delete remotePlayers[id];
    return { remotePlayers };
  }),
  clearRemotePlayers: () => set({ remotePlayers: {} }),
  pruneRemotePlayers: (olderThan) => set((state) => ({ remotePlayers: Object.fromEntries(Object.entries(state.remotePlayers).filter(([, player]) => player.updatedAt >= olderThan)) })),
  setConnectionState: (connectionState, transportLabel) => set((state) => ({ connectionState, transportLabel: transportLabel ?? state.transportLabel })),
  setNearbyAction: (nearbyAction) => set({ nearbyAction }),
  openPanel: (activePanel) => set({ activePanel }),
  closePanel: () => set({ activePanel: null }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  toggleCameraMode: () => set((state) => ({ cameraMode: state.cameraMode === "top" ? "follow" : "top" })),
  setClickTarget: (clickTarget) => set({ clickTarget }),
  setLightingMode: (lightingMode) => set({ lightingMode }),
  cycleLightingMode: () => set((state) => {
    const next = state.lightingMode === "day" ? "sunset" : state.lightingMode === "sunset" ? "night" : "day";
    return { lightingMode: next };
  }),
  setIsSitting: (isSitting) => set({ isSitting }),
  setIsCaffeinated: (isCaffeinated) => set({ isCaffeinated }),
  setLofiPlaying: (lofiPlaying) => set({ lofiPlaying }),
  toggleLofi: () => set((state) => ({ lofiPlaying: !state.lofiPlaying })),
  nextBoardroomSlide: () => set((state) => ({ boardroomSlide: (state.boardroomSlide + 1) % 3 })),
  setAvatarStatus: (avatarStatus) => set((state) => ({ avatarStatus, player: { ...state.player, status: avatarStatus, updatedAt: Date.now() } })),
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(0.6, Math.min(1.8, zoomLevel)) }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(1.8, state.zoomLevel + 0.15) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(0.6, state.zoomLevel - 0.15) })),
  resetZoom: () => set({ zoomLevel: 1.0 }),
}));
