import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useRef } from "react";
import { useTheme } from "./theme-provider";

// barebones excalidraw editor
export default function ExcalidrawEditor() {
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const { theme } = useTheme();

  // empty handler for saving
  const handleOnChange = () => {};

  return (
    <div className="h-[500px] w-full border">
      <Excalidraw
        excalidrawAPI={(api) => (excalidrawApi.current = api)}
        onChange={handleOnChange}
        theme={theme as "light" | "dark"}
      >
        <WelcomeScreen />
      </Excalidraw>
    </div>
  );
}
