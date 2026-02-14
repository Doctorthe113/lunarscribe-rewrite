import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Note = {
  filename: string;
  timestamp?: string;
  content: string;
  type: "md" | "draw";
};

type NoteState = {
  buffer: Note[];
  currentFile: Note;
  setBuffer: (buffer: Note[]) => void;
  setCurrentFile: (file: Note) => void;
  updateNote: (filename: string, content: string, type: "md" | "draw") => void;
};

// store for managing notes with persistence
export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      buffer: [],
      currentFile: { filename: "", content: "", type: "md" },
      setBuffer: (buffer) => set({ buffer }),
      setCurrentFile: (currentFile) => set({ currentFile }),
      updateNote: (filename, content, type) =>
        set((state) => ({
          buffer: state.buffer.map((note) =>
            note.filename === filename
              ? {
                  ...note,
                  content,
                  type,
                  timestamp: new Date().toISOString(),
                }
              : note,
          ),
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
