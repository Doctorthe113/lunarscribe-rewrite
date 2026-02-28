"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type SourceModeContextValue = {
  sourceModeEnabled: boolean;
  toggleSourceMode: () => void;
  sourceScrollTopPx: number;
  setSourceScrollTopPx: (scrollTopPx: number) => void;
};

const SourceModeContext = createContext<SourceModeContextValue | null>(null);

export function SourceModeProvider({ children }: { children: ReactNode }) {
  const [sourceModeEnabled, setSourceModeEnabled] = useState(false);
  const [sourceScrollTopPx, setSourceScrollTopPx] = useState(0);

  const value = useMemo(
    () => ({
      sourceModeEnabled,
      toggleSourceMode: () => setSourceModeEnabled((prev) => !prev),
      sourceScrollTopPx,
      setSourceScrollTopPx,
    }),
    [sourceModeEnabled, sourceScrollTopPx],
  );

  return (
    <SourceModeContext.Provider value={value}>
      {children}
    </SourceModeContext.Provider>
  );
}

export function useSourceModeContext() {
  const context = useContext(SourceModeContext);
  if (!context)
    throw new Error(
      "useSourceModeContext must be used inside SourceModeProvider",
    );
  return context;
}
