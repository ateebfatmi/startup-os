"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOfficeStore } from "@/features/virtual-office/store";
import { CallEngine } from "./call-engine";
import { createSignalingTransport } from "./signaling";
import { useCallStore } from "./store";
import { loadIceServers } from "./ice";

export function useHuddle(workspaceId: string, roomId: string) {
  const engine = useRef<CallEngine | null>(null);
  const currentRoom = useRef<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const status = useCallStore((state) => state.status);
  const participants = useCallStore((state) => state.participants);
  const error = useCallStore((state) => state.error);

  const join = useCallback(async (withVideo: boolean, targetRoomId = roomId) => {
    if (engine.current && currentRoom.current === targetRoomId) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) useCallStore.getState().setStatus("error", "Camera and microphone access are unavailable in this browser.");
      return;
    }
    if (engine.current) { await engine.current.leave(); engine.current = null; currentRoom.current = null; setActiveRoomId(null); useCallStore.getState().reset(); }
    const identity = useOfficeStore.getState().player;
    useCallStore.getState().setStatus("requesting_permission");
    const iceServers = await loadIceServers();
    const nextEngine = new CallEngine(targetRoomId, { id: identity.id, name: identity.name }, createSignalingTransport(workspaceId, targetRoomId), {
      onParticipant: (participant) => useCallStore.getState().upsertParticipant(participant),
      onParticipantChange: (id, patch) => useCallStore.getState().updateParticipant(id, patch),
      onParticipantLeave: (id) => useCallStore.getState().removeParticipant(id),
    }, iceServers);
    engine.current = nextEngine;
    currentRoom.current = targetRoomId;
    try {
      await nextEngine.join(withVideo);
      setActiveRoomId(targetRoomId);
      useCallStore.getState().setStatus("connected");
    } catch (reason) {
      await nextEngine.leave();
      engine.current = null;
      currentRoom.current = null;
      setActiveRoomId(null);
      const message = reason instanceof DOMException && reason.name === "NotAllowedError" ? "Camera or microphone permission was not granted." : "The huddle could not start. Check your media devices and connection.";
      useCallStore.getState().setStatus("error", message);
    }
  }, [roomId, workspaceId]);

  const leave = useCallback(async () => {
    await engine.current?.leave();
    engine.current = null;
    currentRoom.current = null;
    setActiveRoomId(null);
    useCallStore.getState().reset();
  }, []);

  const toggleMicrophone = useCallback(() => {
    const local = Object.values(useCallStore.getState().participants).find((participant) => participant.isLocal);
    if (local) void engine.current?.setMicrophone(!local.microphoneEnabled);
  }, []);
  const toggleCamera = useCallback(() => {
    const local = Object.values(useCallStore.getState().participants).find((participant) => participant.isLocal);
    if (local) void engine.current?.setCamera(!local.cameraEnabled);
  }, []);
  const toggleScreenShare = useCallback(async () => {
    const local = Object.values(useCallStore.getState().participants).find((participant) => participant.isLocal);
    if (!local || !engine.current) return;
    try {
      if (local.screenSharing) await engine.current.stopScreenShare();
      else await engine.current.startScreenShare();
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "NotAllowedError")) {
        console.error("Screen sharing could not start", reason);
      }
    }
  }, []);

  useEffect(() => {
    const cleanup = () => { void engine.current?.leave(); engine.current = null; currentRoom.current = null; useCallStore.getState().reset(); };
    window.addEventListener("pagehide", cleanup);
    return () => { window.removeEventListener("pagehide", cleanup); cleanup(); };
  }, []);
  return { status, participants, error, activeRoomId, join, leave, toggleMicrophone, toggleCamera, toggleScreenShare };
}

export type HuddleController = ReturnType<typeof useHuddle>;
