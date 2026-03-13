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

// Hash scene change signature.
function getSceneSignature(
  elements: ReadonlyArray<{ version: number; versionNonce: number }>,
) {
  let hashValue = 5381;
  for (const element of elements) {
    hashValue = (hashValue << 5) + hashValue + element.version;
    hashValue = (hashValue << 5) + hashValue + element.versionNonce;
  }
  return `${elements.length}:${hashValue >>> 0}`;
}

export default function ExcalidrawEditor() {
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const lastSavedSceneSignatureRef = useRef("");
  const { theme } = useTheme();
  const { currentFile, updateNote } = useNoteStore();
  const [parsedFile, setParsedFile] = useState("");
  const [initialData, setInitialData] =
    useState<ExcalidrawInitialDataState | null>(null);

  // Force local packaged fonts (Tauri/Flatpak may not reach Excalidraw CDN).
  if (typeof window !== "undefined") {
    const excalidrawWindow = window as unknown as Window &
      Record<string, string | string[] | undefined>;
    if (!excalidrawWindow.EXCALIDRAW_ASSET_PATH) {
      const assetBaseUrls: string[] = [];
      if (window.location.origin && window.location.origin !== "null") {
        assetBaseUrls.push(`${window.location.origin}/`);
      }
      assetBaseUrls.push(new URL("./", window.location.href).toString());
      excalidrawWindow.EXCALIDRAW_ASSET_PATH = assetBaseUrls;
    }
  }

  // re-parse when file changes
  if (parsedFile !== currentFile.filename) {
    setParsedFile(currentFile.filename);
    setInitialData(null);
    lastSavedSceneSignatureRef.current = "";

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
    const sceneSignature = getSceneSignature(elements);
    if (sceneSignature === lastSavedSceneSignatureRef.current) return;

    const appState = excalidrawApi.current.getAppState();
    const content = JSON.stringify({ elements, appState }, null, 2);
    updateNote(currentFile.filename, content, currentFile.type);
    await saveFile(currentFile.filename, currentFile.type, content);
    lastSavedSceneSignatureRef.current = sceneSignature;
  }, 800);

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
