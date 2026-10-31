"use client";

import { create } from "zustand";
import type { Availability, ConnectionState, InteractionKind, PlayerSnapshot } from "./types";
import { DEFAULT_OFFICE_DESIGN, type OfficeDesignSettings } from "./office-design";
import type { OfficeObject } from "./office-object-catalog";
import { getOfficeRoomAt } from "./office-data";

type OfficeState = {
  player: PlayerSnapshot;
  remotePlayers: Record<string, PlayerSnapshot>;
  connectionState: ConnectionState;
  transportLabel: string;
  nearbyAction: { kind: InteractionKind; label: string; special?: string; teammateId?: "dev" | "design" | "finance" } | null;
  activePanel: InteractionKind | null;
  cameraMode: "top" | "follow";
  clickTarget: { x: number; z: number } | null;
  lightingMode: "day" | "sunset" | "night";
  isSitting: boolean;
  isCaffeinated: boolean;
  lofiPlaying: boolean;
  boardroomSlide: number;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  presenterName: string | null;
  avatarStatus: Availability;
  zoomLevel: number;
  proximityPlayers: string[];
  activeAITeammate: "dev" | "design" | "finance" | null;
  recentEmotes: Array<{ id: string; playerId: string; emoji: string; x: number; y: number; z: number; createdAt: number }>;
  avatarOutfit: { hat?: string; glasses?: boolean; jacketColor?: string };
  startupMetrics: { mrr: number; burnRate: number; runwayMonths: number; activePRs: number };
  officeDesign: OfficeDesignSettings;
  officeObjects: OfficeObject[];
  avatarAssetReady: boolean;
  touchInput: { x: number; z: number };
  qualityMode: "high" | "reduced";
  measuredFps: number;
  rendererClass: "unknown" | "hardware" | "software";
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
  prevBoardroomSlide: () => void;
  setBoardroomSlide: (slide: number) => void;
  setScreenSharing: (active: boolean, stream?: MediaStream | null, presenterName?: string | null) => void;
  setProximityPlayers: (players: string[]) => void;
  openAITeammate: (teammate: "dev" | "design" | "finance") => void;
  closeAITeammate: () => void;
  triggerEmote: (emoji: string, playerId?: string) => void;
  setAvatarOutfit: (outfit: Partial<OfficeState["avatarOutfit"]>) => void;
  setAvatarStatus: (status: Availability) => void;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setOfficeDesign: (design: OfficeDesignSettings) => void;
  setOfficeObjects: (objects: OfficeObject[]) => void;
  setAvatarAssetReady: (ready: boolean) => void;
  setTouchInput: (input: { x: number; z: number }) => void;
  setQualityMode: (mode: "high" | "reduced") => void;
  setMeasuredFps: (fps: number) => void;
  setRendererClass: (value: "hardware" | "software") => void;
};

export const useOfficeStore = create<OfficeState>((set) => ({
  player: { id: "local", name: "You", x: 0, z: 1.6, rotation: Math.PI, updatedAt: Date.now(), color: "#ff8a4c", status: "available" },
  remotePlayers: {},
  connectionState: "connecting",
  transportLabel: "Local network",
  nearbyAction: null,
  activePanel: null,
  cameraMode: "follow",
  clickTarget: null,
  lightingMode: "day",
  isSitting: false,
  isCaffeinated: false,
  lofiPlaying: false,
  boardroomSlide: 0,
  isScreenSharing: false,
  screenStream: null,
  presenterName: null,
  avatarStatus: "available",
  zoomLevel: 1.0,
  proximityPlayers: [],
  activeAITeammate: null,
  recentEmotes: [],
  avatarOutfit: { jacketColor: "#ff8a4c", glasses: false },
  startupMetrics: { mrr: 48200, burnRate: 14500, runwayMonths: 18.4, activePRs: 4 },
  officeDesign: DEFAULT_OFFICE_DESIGN,
  officeObjects: [],
  avatarAssetReady: false,
  touchInput: { x: 0, z: 0 },
  qualityMode: "high",
  measuredFps: 0,
  rendererClass: "unknown",
  setPlayerTransform: (x, z, rotation) => set((state) => ({ player: { ...state.player, x, z, rotation, roomId: getOfficeRoomAt(x, z)?.id, updatedAt: Date.now() } })),
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
  prevBoardroomSlide: () => set((state) => ({ boardroomSlide: (state.boardroomSlide - 1 + 3) % 3 })),
  setBoardroomSlide: (boardroomSlide) => set({ boardroomSlide }),
  setScreenSharing: (isScreenSharing, screenStream = null, presenterName = null) => set({ isScreenSharing, screenStream, presenterName }),
  setProximityPlayers: (proximityPlayers) => set({ proximityPlayers }),
  openAITeammate: (activeAITeammate) => set({ activeAITeammate }),
  closeAITeammate: () => set({ activeAITeammate: null }),
  triggerEmote: (emoji, playerId = "local") => set((state) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const player = playerId === "local" ? state.player : state.remotePlayers[playerId] || state.player;
    const newEmote = { id, playerId, emoji, x: player.x, y: 1.8, z: player.z, createdAt: Date.now() };
    return { recentEmotes: [...state.recentEmotes.slice(-20), newEmote] };
  }),
  setAvatarOutfit: (outfit) => set((state) => ({ avatarOutfit: { ...state.avatarOutfit, ...outfit } })),
  setAvatarStatus: (avatarStatus) => set((state) => ({ avatarStatus, player: { ...state.player, status: avatarStatus, updatedAt: Date.now() } })),
  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(0.5, Math.min(2.4, zoomLevel)) }),
  zoomIn: () => set((state) => ({ zoomLevel: Math.min(2.4, state.zoomLevel + 0.15) })),
  zoomOut: () => set((state) => ({ zoomLevel: Math.max(0.5, state.zoomLevel - 0.15) })),
  resetZoom: () => set({ zoomLevel: 1.0 }),
  setOfficeDesign: (officeDesign) => set({ officeDesign }),
  setOfficeObjects: (officeObjects) => set({ officeObjects }),
  setAvatarAssetReady: (avatarAssetReady) => set({ avatarAssetReady }),
  setTouchInput: (touchInput) => set({ touchInput }),
  setQualityMode: (qualityMode) => set({ qualityMode }),
  setMeasuredFps: (measuredFps) => set({ measuredFps }),
  setRendererClass: (rendererClass) => set({ rendererClass }),
}));
