import { useState } from "react";
import { toast } from "sonner";
import { Input } from "./components/ui/input";
import { renameFile } from "./lib/filesystem";
import { useNoteStore } from "./lib/note-zustand";
import { tryCatch } from "./lib/try-catch";

export function FileRename() {
  const { currentFile, setCurrentFile } = useNoteStore();
  const [newName, setNewName] = useState(currentFile?.filename || "untitled");

  const handleRename = async () => {
    if (newName === currentFile.filename) return;

    const { data: finalName, error } = await tryCatch(
      renameFile(currentFile, newName),
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    if (finalName) {
      setCurrentFile({ ...currentFile, filename: finalName });
      setNewName(finalName);
    }
  };

  return (
    <Input
      className="mx-auto h-6 w-min min-w-0 border-none text-center text-primary shadow-none ring-0 dark:bg-transparent"
      size={newName.length || 1}
      key={currentFile.filename}
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && handleRename()}
      onBlur={handleRename}
    />
  );
}
