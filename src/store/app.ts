import { create } from "zustand";

interface AuthEntry {
  token: string;
}

interface AppState {
  // token per folder
  tokens: Record<string, string>;
  setToken: (folder: string, token: string) => void;
  getToken: (folder: string) => string | undefined;
  clearToken: (folder: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tokens: {},
  setToken: (folder, token) =>
    set((s) => ({ tokens: { ...s.tokens, [folder]: token } })),
  getToken: (folder) => get().tokens[folder],
  clearToken: (folder) =>
    set((s) => {
      const t = { ...s.tokens };
      delete t[folder];
      return { tokens: t };
    }),
}));
