import { create } from "zustand";

export type SoftphoneState =
  | "idle"
  | "dialing"
  | "ringing_in"
  | "in_call"
  | "on_hold"
  | "wrap_up";

interface ActiveCall {
  id: string;
  direction: "inbound" | "outbound";
  number: string;
  contactName?: string;
  startedAt: string;
  answeredAt?: string;
}

interface SoftphoneStore {
  open: boolean;
  state: SoftphoneState;
  active: ActiveCall | null;
  muted: boolean;
  recording: boolean;
  dialpad: string;
  setOpen: (v: boolean) => void;
  setState: (s: SoftphoneState) => void;
  setActive: (c: ActiveCall | null) => void;
  setMuted: (v: boolean) => void;
  setRecording: (v: boolean) => void;
  setDialpad: (v: string) => void;
  reset: () => void;
}

export const useSoftphone = create<SoftphoneStore>((set) => ({
  open: false,
  state: "idle",
  active: null,
  muted: false,
  recording: false,
  dialpad: "",
  setOpen: (open) => set({ open }),
  setState: (state) => set({ state }),
  setActive: (active) => set({ active }),
  setMuted: (muted) => set({ muted }),
  setRecording: (recording) => set({ recording }),
  setDialpad: (dialpad) => set({ dialpad }),
  reset: () => set({ state: "idle", active: null, muted: false, recording: false, dialpad: "" }),
}));
