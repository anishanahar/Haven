"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";

interface AuthState {
  token: string | null;
  user: User | null;
  walletId: string | null;
  setSession: (token: string, user: User, walletId: string) => void;
  clearSession: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      walletId: null,
      setSession: (token, user, walletId) => set({ token, user, walletId }),
      clearSession: () => set({ token: null, user: null, walletId: null }),
      updateUser: (partial) => set((state) => (state.user ? { user: { ...state.user, ...partial } } : state)),
    }),
    { name: "nest-auth" },
  ),
);
