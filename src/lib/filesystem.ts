import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  remove,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { Note } from "@/lib/note-zustand";
import { tryCatch } from "@/lib/try-catch";

const LUNARSCRIBE_BASE_PATH = "lunarscribe";

async function ensureLunarscribeDirExists() {
  const { error } = await tryCatch(
    mkdir(LUNARSCRIBE_BASE_PATH, {
      baseDir: BaseDirectory.Document,
      recursive: true,
    }),
  );
  if (error) throw new Error(`Mkdir failed: ${error}`);
}

// resolves note to path, null if invalid type
function resolvePath(note: Pick<Note, "filename" | "type">) {
  const trimmed = note.filename.trim() || "untitled";
  const baseName = trimmed.replace(/\.[^/.]+$/, "");
  const ext =
    note.type ?? (trimmed.includes(".") ? trimmed.split(".").pop() : "");
  if (ext !== "md" && ext !== "draw") return null;
  return `${LUNARSCRIBE_BASE_PATH}/${baseName}.${ext}`;
}

// gets unique filename by adding suffix
export async function getUniqueFilename(note: Pick<Note, "filename" | "type">) {
  const resolvedPath = resolvePath(note);
  if (!resolvedPath) return note.filename;

  const { data: isTaken } = await tryCatch(
    exists(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (!isTaken) return note.filename;

  const baseName = note.filename.trim().replace(/\.[^/.]+$/, "");

  let suffix = 1;
  while (true) {
    const candidateName = `${baseName}(${suffix})`;
    const candidatePath = resolvePath({ ...note, filename: candidateName });
    const { data: taken } = await tryCatch(
      exists(candidatePath!, { baseDir: BaseDirectory.Document }),
    );
    if (!taken) return `${candidateName}.${note.type}`;
    suffix += 1;
  }
}

// writes file in lunarscribe folder
export async function writeFile(note: Note) {
  await ensureLunarscribeDirExists();

  const resolvedPath = resolvePath(note);
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    writeTextFile(resolvedPath, note.content, {
      baseDir: BaseDirectory.Document,
    }),
  );
  if (error) throw new Error(`Write failed: ${error}`);
  return resolvedPath;
}

// reads file content
export async function readFile(note: Note) {
  const resolvedPath = resolvePath(note);
  if (!resolvedPath) return;

  const { data, error } = await tryCatch(
    readTextFile(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Read failed: ${error}`);
  return data ?? "";
}

// renames with unique suffix
export async function renameFile(note: Note, newFilename: string) {
  const oldPath = resolvePath(note);
  const newPath = resolvePath({ ...note, filename: newFilename });
  if (!oldPath || !newPath) return;
  if (oldPath === newPath) return newPath;

  const targetFilename = await getUniqueFilename({
    ...note,
    filename: newFilename,
  });
  const uniqueNewPath = resolvePath({ ...note, filename: targetFilename });
  if (!uniqueNewPath) return;

  const { error } = await tryCatch(
    rename(oldPath, uniqueNewPath, {
      oldPathBaseDir: BaseDirectory.Document,
      newPathBaseDir: BaseDirectory.Document,
    }),
  );
  if (error) throw new Error(`Rename failed: ${error}`);
  return uniqueNewPath;
}

// deletes file
export async function deleteFile(note: Note) {
  const resolvedPath = resolvePath(note);
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    remove(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Delete failed: ${error}`);
  return true;
}

// checks file existence
export async function fileExists(note: Note) {
  const resolvedPath = resolvePath(note);
  if (!resolvedPath) return false;

  const { data, error } = await tryCatch(
    exists(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Exists check failed: ${error}`);
  return Boolean(data);
}
