"use client";

import { useCallback, useEffect, useState } from "react";
import { useOfficeStore } from "@/features/virtual-office/store";
import type { PlayerSnapshot } from "@/features/virtual-office/types";
import type { HuddleController } from "./use-huddle";

const ENTER_RADIUS = 3.2;
const EXIT_RADIUS = 4.4;

export type ProximityGroup = { roomId: string; memberIds: string[]; names: string[] } | null;

function roomHash(ids: string[]) {
  let hash = 2166136261;
  for (const character of ids.sort().join("|")) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `proximity-${(hash >>> 0).toString(36)}`;
}

export function computeProximityGroup(players: PlayerSnapshot[], localId: string, previous: ProximityGroup): ProximityGroup {
  const local = players.find((player) => player.id === localId); if (!local) return null;
  const byId = new Map(players.map((player) => [player.id, player]));
  const members = new Set([localId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of players) {
      if (members.has(candidate.id)) continue;
      const threshold = previous?.memberIds.includes(candidate.id) ? EXIT_RADIUS : ENTER_RADIUS;
      if ([...members].some((id) => { const member = byId.get(id)!; return Math.hypot(member.x - candidate.x, member.z - candidate.z) <= threshold; })) {
        members.add(candidate.id); changed = true;
      }
    }
  }
  const ids = [...members].sort();
  return ids.length > 1 ? { roomId: roomHash(ids), memberIds: ids, names: ids.filter((id) => id !== localId).map((id) => byId.get(id)?.name || "Teammate") } : null;
}

export function useProximityAudio(huddle: HuddleController) {
  const [enabled, setEnabled] = useState(false);
  const [group, setGroup] = useState<ProximityGroup>(null);

  useEffect(() => {
    const sample = () => {
      const state = useOfficeStore.getState();
      const players = [state.player, ...Object.values(state.remotePlayers)];
      const next = computeProximityGroup(players, state.player.id, group);
      setGroup((current) => current?.roomId === next?.roomId && current?.names.join("|") === next?.names.join("|") ? current : next);
    };
    sample(); const timer = window.setInterval(sample, 350); return () => window.clearInterval(timer);
  }, [group?.memberIds]);

  const { activeRoomId, join, leave, status } = huddle;
  useEffect(() => {
    if (!enabled) {
      if (activeRoomId?.startsWith("proximity-")) void leave();
      return;
    }
    if (!group) {
      if (activeRoomId?.startsWith("proximity-")) void leave();
      return;
    }
    if (activeRoomId && !activeRoomId.startsWith("proximity-")) return;
    if (activeRoomId !== group.roomId && status !== "requesting_permission" && status !== "joining") void join(false, group.roomId);
  }, [activeRoomId, enabled, group, join, leave, status]);

  const toggle = useCallback(() => setEnabled((value) => !value), []);
  const active = enabled && Boolean(group) && activeRoomId === group?.roomId && status === "connected";
  return { enabled, active, group, toggle, status };
}

export type ProximityAudioController = ReturnType<typeof useProximityAudio>;
