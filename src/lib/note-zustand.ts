import { create } from "zustand";

export type Note = {
  filename: string;
  timestamp?: string;
  content: string;
  type: "md" | "draw";
};

type NoteState = {
  buffer: Note[];
  currentFile: Note | null;
  setBuffer: (buffer: Note[]) => void;
  setCurrentFile: (file: Note | null) => void;
  updateNote: (filename: string, content: string) => void;
};

// store for managing notes
export const useNoteStore = create<NoteState>((set) => ({
  buffer: [],
  currentFile: null,
  setBuffer: (buffer) => set({ buffer }),
  setCurrentFile: (currentFile) => set({ currentFile }),
  updateNote: (filename, content) =>
    set((state) => ({
      buffer: state.buffer.map((note) =>
        note.filename === filename
          ? { ...note, content, timestamp: new Date().toISOString() }
          : note,
      ),
      currentFile:
        state.currentFile?.filename === filename
          ? {
              ...state.currentFile,
              content,
              timestamp: new Date().toISOString(),
            }
          : state.currentFile,
    })),
}));
