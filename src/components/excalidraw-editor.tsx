import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { saveFile } from "@/lib/filesystem";
import { useNoteStore } from "@/lib/note-zustand";
import { tryCatchSync } from "@/lib/try-catch";
import { useTheme } from "./theme-provider";

export default function ExcalidrawEditor() {
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const { theme } = useTheme();
  const { currentFile, updateNote } = useNoteStore();
  const [parsedFile, setParsedFile] = useState("");
  const [initialData, setInitialData] =
    useState<ExcalidrawInitialDataState | null>(null);

  // re-parse when file changes
  if (parsedFile !== currentFile.filename) {
    setParsedFile(currentFile.filename);
    setInitialData(null);

    if (currentFile.content) {
      const { data } = tryCatchSync(() => JSON.parse(currentFile.content));
      if (data) {
        const appState = data.appState || {};
        // collaborators must be a Map, JSON serializes it as object
        if (appState.collaborators && !Array.isArray(appState.collaborators)) {
          delete appState.collaborators;
        }
        setInitialData({ appState, elements: data.elements || [] });
      }
    }
  }

  // debounced save via imperative API
  const saveDebounced = useDebouncedCallback(async () => {
    if (!excalidrawApi.current) return;
    const elements = excalidrawApi.current.getSceneElements();
    const appState = excalidrawApi.current.getAppState();
    const content = JSON.stringify({ elements, appState }, null, 2);
    updateNote(currentFile.filename, content, currentFile.type);
    await saveFile(currentFile.filename, currentFile.type, content);
  }, 300);

  if (!currentFile) return null;

  return (
    <div className="h-full min-h-0 w-full">
      <Excalidraw
        key={currentFile.filename}
        initialData={initialData}
        excalidrawAPI={(api) => {
          excalidrawApi.current = api;
        }}
        theme={theme as "light" | "dark"}
        onChange={saveDebounced}
      >
        <WelcomeScreen />
      </Excalidraw>
    </div>
  );
}
