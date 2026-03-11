import ExcalidrawEditor from "@/components/excalidraw-editor";
import TextEditor from "@/components/text-editor";
import { useGlobalStore } from "@/lib/global-zustand";

type WindowType = "text" | "draw" | "others";

const WINDOW_MAP: Record<WindowType, React.ReactNode> = {
  text: (
    <section key="text" className="flex h-full w-full max-w-3xl flex-col">
      <TextEditor />
    </section>
  ),
  draw: (
    <section key="draw" className="flex h-full w-full flex-col">
      <ExcalidrawEditor />
    </section>
  ),
  others: null,
};

export default function App() {
  const activeWindow = useGlobalStore((s) => s.activeWindow);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-4 p-4">
      {WINDOW_MAP[activeWindow]}
    </div>
  );
}
