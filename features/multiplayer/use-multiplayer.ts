"use client";

import { useEffect } from "react";
import { useOfficeStore } from "@/features/virtual-office/store";
import type { PlayerSnapshot } from "@/features/virtual-office/types";
import { NETWORK_RATE_HZ, snapshotChanged, STALE_PLAYER_MS } from "./protocol";
import { createTransport } from "./transport";

const AVATAR_COLORS = ["#58a77b", "#6c86d9", "#d06fa9", "#e5a13e", "#7863c6"];

function getSessionIdentity() {
  const storedId = window.sessionStorage.getItem("orbit-player-id");
  const id = storedId ?? crypto.randomUUID();
  if (!storedId) window.sessionStorage.setItem("orbit-player-id", id);
  const colorIndex = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return { id, name: window.localStorage.getItem("orbit-display-name") || "Teammate", color: AVATAR_COLORS[colorIndex] };
}

export function useMultiplayer(workspaceId: string) {
  useEffect(() => {
    const identity = getSessionIdentity();
    const store = useOfficeStore.getState();
    store.setPlayerIdentity(identity);
    const transport = createTransport(workspaceId, identity.id);
    let previous: PlayerSnapshot | null = null;
    let disposed = false;

    void transport.connect({
      onPlayer: (player) => useOfficeStore.getState().upsertRemotePlayer(player),
      onLeave: (id) => useOfficeStore.getState().removeRemotePlayer(id),
      onState: (state, label) => useOfficeStore.getState().setConnectionState(state, label),
    }).then(() => {
      if (!disposed) void transport.publish(useOfficeStore.getState().player);
    });

    const publishTimer = window.setInterval(() => {
      const current = useOfficeStore.getState().player;
      if (snapshotChanged(previous, current)) {
        previous = { ...current };
        void transport.publish(current);
      }
    }, Math.round(1000 / NETWORK_RATE_HZ));
    const pruneTimer = window.setInterval(() => useOfficeStore.getState().pruneRemotePlayers(Date.now() - STALE_PLAYER_MS), 5_000);

    return () => {
      disposed = true;
      window.clearInterval(publishTimer);
      window.clearInterval(pruneTimer);
      void transport.disconnect();
    };
  }, [workspaceId]);
}
