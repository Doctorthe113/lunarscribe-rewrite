import { useState } from "react";
import ExcalidrawEditor from "@/components/excalidraw-editor";
import TextEditor from "@/components/text-editor";

type WindowType = "text" | "draw" | "others";

const WINDOW_MAP: Record<WindowType, React.ReactNode> = {
  text: (
    <section key="text">
      <TextEditor />
    </section>
  ),
  draw: (
    <section key="draw">
      <ExcalidrawEditor />
    </section>
  ),
  others: null,
};

export default function App() {
  const [activeWindow, _setActiveWindow] = useState<WindowType>("text");

  return (
    <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-2">
      <div className="w-full max-w-3xl space-y-8">
        {WINDOW_MAP[activeWindow]}
      </div>
    </div>
  );
}
