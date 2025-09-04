import { create } from "zustand";
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

export const useUserStore = create<UserState>((set, _get) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  fetchUser: async () => {
    try {
      const res = await apiClient.get("/auth/me");
      debugger;
      set({ user: res.data });
    } catch (e) {
      console.error("Error fetching user (store):", e);
      set({ user: null });
    }
  },
}));
