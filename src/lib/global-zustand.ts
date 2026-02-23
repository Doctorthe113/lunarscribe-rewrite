import { create } from "zustand";
import { persist } from "zustand/middleware";

type WindowType = "text" | "draw" | "others";

type GlobalState = {
  activeWindow: WindowType;
  setActiveWindow: (window: WindowType) => void;
};

// persistent store for global app state
export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      activeWindow: "text",
      setActiveWindow: (activeWindow) => set({ activeWindow }),
    }),
    {
      name: "lunarscribe-global-store",
    },
  ),
);
