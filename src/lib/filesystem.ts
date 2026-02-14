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

type FileType = "md" | "draw" | "others";

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

// resolves filename to path in lunarscribe folder, returns null if invalid type
function resolvePath(note: Pick<Note, "filename" | "type">) {
  const trimmedName = note.filename.trim() || "untitled";
  const nameWithoutExtension = trimmedName.replace(/\.[^/.]+$/, "");
  const extensionFromName = trimmedName.includes(".")
    ? (trimmedName.split(".").pop() ?? "")
    : "";
  const finalExtension = note.type ?? extensionFromName;
  if (finalExtension !== "md" && finalExtension !== "draw") return null;
  return `${LUNARSCRIBE_BASE_PATH}/${nameWithoutExtension}.${finalExtension}`;
}

// gets unique filename by adding suffix
export async function getUniqueFilename(note: Note) {
  const resolvedPath = resolvePath(note);
  if (!resolvedPath) return note.filename;

  const { data: isTaken } = await tryCatch(
    exists(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (!isTaken) return note.filename;

  const nameWithoutExtension = note.filename.trim().replace(/\.[^/.]+$/, "");
  const ext = note.type;

  let suffix = 1;
  while (true) {
    const candidateName = `${nameWithoutExtension}(${suffix})`;
    const candidatePath = resolvePath({ ...note, filename: candidateName });
    const { data: taken } = await tryCatch(
      exists(candidatePath!, { baseDir: BaseDirectory.Document }),
    );
    if (!taken) return `${candidateName}.${ext}`;
    suffix += 1;
  }
}

// writes file in lunarscribe folder
export async function writeFile(note: Note) {
  await ensureLunarscribeDirExists();

  const resolvedPath = resolvePath(note.filename, note.type);
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    writeTextFile(resolvedPath, note.content, {
      baseDir: BaseDirectory.Document,
    }),
  );
  if (error) throw new Error(`Write failed: ${error}`);
  return resolvedPath;
}

// reads file text only
export async function readFile(note: Note) {
  const resolvedPath = resolvePath(note.filename, note.type);
  if (!resolvedPath) return;

  const { data, error } = await tryCatch(
    readTextFile(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Read failed: ${error}`);
  return data ?? "";
}

// renames with duplicate suffix
export async function renameFile(note: Note, newFilename: string) {
  const oldPath = resolvePath(note.filename, note.type);
  const newPath = resolvePath(newFilename, note.type);
  if (!oldPath || !newPath) return;
  if (oldPath === newPath) return newPath;

  const targetFilename = await getUniqueFilename({
    ...note,
    filename: newFilename,
  });
  const uniqueNewPath = resolvePath(targetFilename, note.type);
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

// deletes file and returns true
export async function deleteFile(note: Note) {
  const resolvedPath = resolvePath(note.filename, note.type);
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    remove(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Delete failed: ${error}`);
  return true;
}

// checks file existence boolean
export async function fileExists(note: Note) {
  const resolvedPath = resolvePath(note.filename, note.type);
  if (!resolvedPath) return false;

  const { data, error } = await tryCatch(
    exists(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Exists check failed: ${error}`);
  return Boolean(data);
}
