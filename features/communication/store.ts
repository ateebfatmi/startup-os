"use client";

import { create } from "zustand";
import type { CallParticipant, CallStatus } from "./types";

type CallState = {
  status: CallStatus;
  participants: Record<string, CallParticipant>;
  error: string | null;
  setStatus: (status: CallStatus, error?: string | null) => void;
  upsertParticipant: (participant: CallParticipant) => void;
  updateParticipant: (id: string, patch: Partial<CallParticipant>) => void;
  removeParticipant: (id: string) => void;
  reset: () => void;
};

export const useCallStore = create<CallState>((set) => ({
  status: "idle",
  participants: {},
  error: null,
  setStatus: (status, error = null) => set({ status, error }),
  upsertParticipant: (participant) => set((state) => ({ participants: { ...state.participants, [participant.id]: participant } })),
  updateParticipant: (id, patch) => set((state) => {
    const participant = state.participants[id];
    if (!participant) return state;
    return { participants: { ...state.participants, [id]: { ...participant, ...patch } } };
  }),
  removeParticipant: (id) => set((state) => {
    const participants = { ...state.participants };
    delete participants[id];
    return { participants };
  }),
  reset: () => set({ status: "idle", participants: {}, error: null }),
}));
