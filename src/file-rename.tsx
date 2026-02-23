import { useRef } from "react";
import { toast } from "sonner";
import { Input } from "./components/ui/input";
import { renameFile } from "./lib/filesystem";
import { useNoteStore } from "./lib/note-zustand";
import { tryCatch } from "./lib/try-catch";

export function FileRename() {
  const { currentFile, setCurrentFile } = useNoteStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const renameFromRef = useRef(currentFile.filename);

  const handleRename = async () => {
    const newFilename = inputRef.current?.value.trim() ?? "";

    if (!newFilename) {
      if (inputRef.current) inputRef.current.value = renameFromRef.current;
      return;
    }

    if (renameFromRef.current === newFilename) return;

    const { data: finalName, error } = await tryCatch(
      renameFile(
        { ...currentFile, filename: renameFromRef.current },
        newFilename,
      ),
    );

    if (error) {
      toast.error(error.message);
      if (inputRef.current) inputRef.current.value = renameFromRef.current;
      return;
    }

    if (finalName) {
      setCurrentFile({ ...currentFile, filename: finalName });
      renameFromRef.current = finalName;
    }
  };

  return (
    <Input
      className="relative mx-auto h-6 w-min min-w-0 -translate-x-1/2 border-none text-center text-primary shadow-none ring-0 xl:absolute xl:left-1/2 dark:bg-transparent"
      ref={inputRef}
      key={currentFile.filename}
      size={currentFile.filename.length || 1}
      defaultValue={currentFile.filename}
      onFocus={() => {
        renameFromRef.current = currentFile.filename;
      }}
      onKeyDown={(e) => e.key === "Enter" && handleRename()}
      onBlur={handleRename}
    />
  );
}
