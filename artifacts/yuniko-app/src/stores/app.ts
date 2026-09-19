import { create } from "zustand";

type AppStore = {
  toast: string | null;
  remoteUserId: string | null;
  authenticated: boolean;
  setToast: (toast: string | null) => void;
  setRemoteUserId: (id: string | null) => void;
  setAuthenticated: (value: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  toast: null,
  remoteUserId: null,
  authenticated: false,
  setToast: (toast) => set({ toast }),
  setRemoteUserId: (remoteUserId) => set({ remoteUserId }),
  setAuthenticated: (authenticated) => set({ authenticated }),
}));
