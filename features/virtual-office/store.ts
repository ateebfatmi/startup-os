"use client";

import { create } from "zustand";
import type { Availability, ConnectionState, InteractionKind, PlayerSnapshot } from "./types";
import { DEFAULT_OFFICE_DESIGN, type OfficeDesignSettings } from "./office-design";
import type { OfficeAssetKey, OfficeObject } from "./office-object-catalog";
import { getOfficeRoomAt } from "./office-data";

type OfficeState = {
  player: PlayerSnapshot;
  remotePlayers: Record<string, PlayerSnapshot>;
  connectionState: ConnectionState;
  transportLabel: string;
  nearbyAction: { kind: InteractionKind; label: string; special?: string; teammateId?: "dev" | "design" | "finance" } | null;
  activePanel: InteractionKind | null;
  viewMode: "3d" | "2d";
  cameraMode: "top" | "follow";
  clickTarget: { x: number; z: number } | null;
  lightingMode: "day" | "sunset" | "night";
  isSitting: boolean;
  isCaffeinated: boolean;
  isGhost: boolean;
  isDancing: boolean;
  isQuietMode: boolean;
  followingPlayerId: string | null;
  locatedPlayerId: string | null;
  claimedDesks: Record<number, { odId: string; name: string }>; // desk index -> owner
  incomingRings: Array<{ id: string; senderName: string; senderId: string; senderPosition: { x: number; z: number }; timestamp: number }>;
  isMapmakerOpen: boolean;
  selectedCatalogAsset: OfficeAssetKey | null;
  activeAppStatus: string | null;
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
  setViewMode: (mode: "3d" | "2d") => void;
  toggleViewMode: () => void;
  setCameraMode: (mode: "top" | "follow") => void;
  toggleCameraMode: () => void;
  setClickTarget: (target: { x: number; z: number } | null) => void;
  setLightingMode: (mode: "day" | "sunset" | "night") => void;
  cycleLightingMode: () => void;
  setIsSitting: (sitting: boolean) => void;
  setIsCaffeinated: (caffeinated: boolean) => void;
  setIsGhost: (ghost: boolean) => void;
  setIsDancing: (dancing: boolean) => void;
  toggleQuietMode: () => void;
  setFollowingPlayerId: (id: string | null) => void;
  setLocatedPlayerId: (id: string | null) => void;
  claimDesk: (deskIndex: number, ownerName?: string) => void;
  unclaimDesk: (deskIndex: number) => void;
  ringTeammate: (targetId: string) => void;
  dismissRing: (ringId: string) => void;
  toggleMapmaker: () => void;
  setIsMapmakerOpen: (open: boolean) => void;
  setSelectedCatalogAsset: (asset: OfficeAssetKey | null) => void;
  addOfficeObject: (object: OfficeObject) => void;
  removeOfficeObject: (id: string) => void;
  rotateOfficeObject: (id: string) => void;
  setActiveAppStatus: (status: string | null) => void;
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

const getSavedViewMode = (): "3d" | "2d" => {
  if (typeof window === "undefined") return "3d";
  try {
    // If running in headless automated test suite (e.g. Playwright CI), use 2d
    if (navigator?.webdriver) return "2d";
    const saved = window.localStorage.getItem("crewvilla-view-mode");
    if (saved === "3d" || saved === "2d") return saved;
  } catch {
    // Ignore storage access errors
  }
  return "3d";
};

const getSavedOfficeObjects = (): OfficeObject[] => {
  if (typeof window === "undefined") {
    return [
      {
        id: "breakroom-arcade-1",
        assetKey: "arcade_machine",
        transform: { x: 7.5, y: 0, z: -5.5, rotationY: 0, scale: 1 },
        interaction: { kind: "arcade", label: "Play Breakroom Mini-Games (2048 / Snake)" },
      },
    ];
  }
  try {
    const saved = window.localStorage.getItem("crewvilla-office-objects");
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore storage access errors
  }
  return [
    {
      id: "breakroom-arcade-1",
      assetKey: "arcade_machine",
      transform: { x: 7.5, y: 0, z: -5.5, rotationY: 0, scale: 1 },
      interaction: { kind: "arcade", label: "Play Breakroom Mini-Games (2048 / Snake)" },
    },
  ];
};

export const useOfficeStore = create<OfficeState>((set) => ({
  player: { id: "local", name: "You", x: 0, z: 4.8, rotation: Math.PI, updatedAt: Date.now(), color: "#ff8a4c", status: "available", roomId: "reception" },
  remotePlayers: {},
  connectionState: "connecting",
  transportLabel: "Local network",
  nearbyAction: null,
  activePanel: null,
  viewMode: getSavedViewMode(),
  cameraMode: "follow",
  clickTarget: null,
  lightingMode: "day",
  isSitting: false,
  isCaffeinated: false,
  isGhost: false,
  isDancing: false,
  isQuietMode: false,
  followingPlayerId: null,
  locatedPlayerId: null,
  claimedDesks: {
    0: { odId: "demo-1", name: "Ateeb (Lead)" },
    1: { odId: "demo-dev", name: "Dev AI" },
    4: { odId: "demo-design", name: "Design AI" },
  },
  incomingRings: [],
  isMapmakerOpen: false,
  selectedCatalogAsset: null,
  activeAppStatus: null,
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
  officeObjects: getSavedOfficeObjects(),
  avatarAssetReady: false,
  touchInput: { x: 0, z: 0 },
  qualityMode: "high",
  measuredFps: 0,
  rendererClass: "unknown",
  setPlayerTransform: (x, z, rotation) => set((state) => {
    const roomId = getOfficeRoomAt(x, z)?.id;
    const inPhoneBooth = Math.hypot(x - 2.4, z - (-6.4)) <= 1.4;
    return {
      player: {
        ...state.player,
        x,
        z,
        rotation,
        roomId,
        inPhoneBooth,
        updatedAt: Date.now(),
      },
    };
  }),
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
  setViewMode: (viewMode) => {
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("crewvilla-view-mode", viewMode); } catch { /* ignore */ }
    }
    set({ viewMode });
  },
  toggleViewMode: () => set((state) => {
    const next = state.viewMode === "3d" ? "2d" : "3d";
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("crewvilla-view-mode", next); } catch { /* ignore */ }
    }
    return { viewMode: next };
  }),
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
  setIsGhost: (isGhost) => set((state) => ({ isGhost, player: { ...state.player, isGhost } })),
  setIsDancing: (isDancing) => set((state) => ({ isDancing, player: { ...state.player, isDancing } })),
  toggleQuietMode: () => set((state) => ({ isQuietMode: !state.isQuietMode })),
  setFollowingPlayerId: (followingPlayerId) => set({ followingPlayerId }),
  setLocatedPlayerId: (locatedPlayerId) => set({ locatedPlayerId }),
  claimDesk: (deskIndex, ownerName) => set((state) => {
    const name = ownerName || state.player.name;
    return {
      claimedDesks: { ...state.claimedDesks, [deskIndex]: { odId: state.player.id, name } },
      player: { ...state.player, claimedDeskIndex: deskIndex }
    };
  }),
  unclaimDesk: (deskIndex) => set((state) => {
    const claimedDesks = { ...state.claimedDesks };
    delete claimedDesks[deskIndex];
    return {
      claimedDesks,
      player: { ...state.player, claimedDeskIndex: null }
    };
  }),
  ringTeammate: (targetId) => set((state) => {
    // If target is local, simulate incoming ring for feedback; otherwise broadcast
    const target = state.remotePlayers[targetId];
    const ring = {
      id: `ring-${Date.now()}`,
      senderName: state.player.name,
      senderId: state.player.id,
      senderPosition: { x: state.player.x, z: state.player.z },
      timestamp: Date.now(),
    };
    return { incomingRings: [ring, ...state.incomingRings.slice(0, 4)] };
  }),
  dismissRing: (ringId) => set((state) => ({
    incomingRings: state.incomingRings.filter((r) => r.id !== ringId)
  })),
  toggleMapmaker: () => set((state) => ({ isMapmakerOpen: !state.isMapmakerOpen })),
  setIsMapmakerOpen: (isMapmakerOpen) => set({ isMapmakerOpen }),
  setSelectedCatalogAsset: (selectedCatalogAsset) => set({ selectedCatalogAsset }),
  setActiveAppStatus: (activeAppStatus) => set((state) => ({
    activeAppStatus,
    player: { ...state.player, activeAppStatus, updatedAt: Date.now() }
  })),
  addOfficeObject: (object) => set((state) => {
    const next = [...state.officeObjects, object];
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("crewvilla-office-objects", JSON.stringify(next)); } catch { /* ignore */ }
    }
    return { officeObjects: next };
  }),
  removeOfficeObject: (id) => set((state) => {
    const next = state.officeObjects.filter((o) => o.id !== id);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("crewvilla-office-objects", JSON.stringify(next)); } catch { /* ignore */ }
    }
    return { officeObjects: next };
  }),
  rotateOfficeObject: (id) => set((state) => {
    const next = state.officeObjects.map((o) =>
      o.id === id
        ? { ...o, transform: { ...o.transform, rotationY: (o.transform.rotationY + Math.PI / 2) % (Math.PI * 2) } }
        : o
    );
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("crewvilla-office-objects", JSON.stringify(next)); } catch { /* ignore */ }
    }
    return { officeObjects: next };
  }),
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
  setOfficeObjects: (officeObjects) => {
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem("crewvilla-office-objects", JSON.stringify(officeObjects)); } catch { /* ignore */ }
    }
    set({ officeObjects });
  },
  setAvatarAssetReady: (avatarAssetReady) => set({ avatarAssetReady }),
  setTouchInput: (touchInput) => set({ touchInput }),
  setQualityMode: (qualityMode) => set({ qualityMode }),
  setMeasuredFps: (measuredFps) => set({ measuredFps }),
  setRendererClass: (rendererClass) => set({ rendererClass }),
}));
