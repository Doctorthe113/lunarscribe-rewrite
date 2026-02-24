import { createContext, type ReactNode, useContext, useState } from "react";

type MathRenderContextType = {
  mathRenderEnabled: boolean;
  toggleMathRender: () => void;
};

const MathRenderContext = createContext<MathRenderContextType>({
  mathRenderEnabled: true,
  toggleMathRender: () => {},
});

export function MathRenderProvider({ children }: { children: ReactNode }) {
  const [mathRenderEnabled, setMathRenderEnabled] = useState(true);

  return (
    <MathRenderContext.Provider
      value={{
        mathRenderEnabled,
        toggleMathRender: () => setMathRenderEnabled((value) => !value),
      }}
    >
      {children}
    </MathRenderContext.Provider>
  );
}

export const useMathRenderContext = () => useContext(MathRenderContext);
