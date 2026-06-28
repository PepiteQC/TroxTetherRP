import { create } from "zustand";

export type View = "landing" | "game" | "admin" | "map" | "character-creator" | "etherprism" | "troxt-chat";

type ServerPing = {
  ok: boolean;
  latencyMs: number;
  time: string;
};

type Store = {
  view: View;
  setView: (v: View) => void;
  serverPing: ServerPing | null;
  setServerPing: (p: ServerPing | null) => void;
  brainResult: any | null;
  setBrainResult: (r: any) => void;
};

export const useAppStore = create<Store>((set) => ({
  view: "landing",
  setView: (view) => set({ view }),
  serverPing: null,
  setServerPing: (serverPing) => set({ serverPing }),
  brainResult: null,
  setBrainResult: (brainResult) => set({ brainResult }),
}));
