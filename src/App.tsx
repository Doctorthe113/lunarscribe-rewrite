import ExcalidrawEditor from "@/components/excalidraw-editor";
import TextEditor from "@/components/text-editor";

export default function App() {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-2 py-4">
      <div className="w-full max-w-3xl space-y-8">
        <section>
          <h2 className="mb-2 font-bold text-xl">Text Editor</h2>
          <TextEditor />
        </section>
        <section>
          <h2 className="mb-2 font-bold text-xl">Excalidraw Editor</h2>
          <ExcalidrawEditor />
        </section>
      </div>
    </div>
  );
}
