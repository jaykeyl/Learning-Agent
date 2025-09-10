import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import apiClient from "../api/apiClient";

export type User = {
  id: string;
  email: string;
  name: string;
  lastname: string;
  roles: string[];
};

type UserState = {
  user: User | null;
  setUser: (u: User | null) => void;
  fetchUser: () => Promise<void>;
};

export const useUserStore = create<UserState>()(
  persist(
    (set, _get) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      fetchUser: async () => {
        try {
          const res = await apiClient.get("/auth/me");
          set({ user: res.data });
        } catch (e) {
          console.error("Error fetching user (store):", e);
          set({ user: null });
        }
      },
    }),
    {
      name: "user",
      partialize: (state) => ({ user: state.user }),
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const sessionRaw = sessionStorage.getItem('auth');
          const localRaw = localStorage.getItem('auth');
          const sessionHasToken = !!sessionRaw && JSON.parse(sessionRaw || '{}')?.accessToken;
          const localHasToken = !!localRaw && JSON.parse(localRaw || '{}')?.accessToken;
          if (sessionHasToken && !localHasToken) return sessionStorage;
          return localStorage;
        } catch {
          return localStorage;
        }
      }),
    }
  )
);
