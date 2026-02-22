import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Note = {
  filename: string;
  timestamp?: string;
  content: string;
  type: "md" | "draw";
};

type NoteState = {
  currentFile: Note;
  setCurrentFile: (file: Note) => void;
  updateNote: (filename: string, content: string, type: "md" | "draw") => void;
};

// store for managing notes with persistence
export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      currentFile: { filename: "", content: "", type: "md" },
      setCurrentFile: (currentFile) => set({ currentFile }),
      updateNote: (filename, content, type) =>
        set((state) => ({
          currentFile:
            state.currentFile.filename === filename
              ? {
                  ...state.currentFile,
                  content,
                  type,
                  timestamp: new Date().toISOString(),
                }
              : state.currentFile,
        })),
    }),
    {
      name: "lunarscribe-note-store",
    },
  ),
);
