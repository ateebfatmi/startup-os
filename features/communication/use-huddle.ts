"use client";

import { useCallback, useEffect, useRef } from "react";
import { useOfficeStore } from "@/features/virtual-office/store";
import { CallEngine } from "./call-engine";
import { createSignalingTransport } from "./signaling";
import { useCallStore } from "./store";

export function useHuddle(workspaceId: string, roomId: string) {
  const engine = useRef<CallEngine | null>(null);
  const status = useCallStore((state) => state.status);
  const participants = useCallStore((state) => state.participants);
  const error = useCallStore((state) => state.error);

  const join = useCallback(async (withVideo: boolean) => {
    if (engine.current || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) useCallStore.getState().setStatus("error", "Camera and microphone access are unavailable in this browser.");
      return;
    }
    const identity = useOfficeStore.getState().player;
    useCallStore.getState().setStatus("requesting_permission");
    const nextEngine = new CallEngine(roomId, { id: identity.id, name: identity.name }, createSignalingTransport(workspaceId, roomId), {
      onParticipant: (participant) => useCallStore.getState().upsertParticipant(participant),
      onParticipantChange: (id, patch) => useCallStore.getState().updateParticipant(id, patch),
      onParticipantLeave: (id) => useCallStore.getState().removeParticipant(id),
    });
    engine.current = nextEngine;
    try {
      await nextEngine.join(withVideo);
      useCallStore.getState().setStatus("connected");
    } catch (reason) {
      await nextEngine.leave();
      engine.current = null;
      const message = reason instanceof DOMException && reason.name === "NotAllowedError" ? "Camera or microphone permission was not granted." : "The huddle could not start. Check your media devices and connection.";
      useCallStore.getState().setStatus("error", message);
    }
  }, [roomId, workspaceId]);

  const leave = useCallback(async () => {
    await engine.current?.leave();
    engine.current = null;
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

  useEffect(() => {
    const cleanup = () => { void engine.current?.leave(); useCallStore.getState().reset(); };
    window.addEventListener("pagehide", cleanup);
    return () => { window.removeEventListener("pagehide", cleanup); cleanup(); };
  }, []);
  return { status, participants, error, join, leave, toggleMicrophone, toggleCamera };
}

export type HuddleController = ReturnType<typeof useHuddle>;
