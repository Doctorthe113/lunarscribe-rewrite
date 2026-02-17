import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
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
  const baseName = note.filename.trim().replace(/\.[^/.]+$/, "") || "untitled";
  const type = note.type;

  let suffix = 0;
  while (true) {
    const candidateName = suffix === 0 ? baseName : `${baseName}(${suffix})`;
    const resolvedPath = resolvePath({ filename: candidateName, type });

    const { data: taken } = await tryCatch(
      exists(resolvedPath!, { baseDir: BaseDirectory.Document }),
    );

    if (!taken) return candidateName;
    suffix += 1;
  }
}

// saves file in lunarscribe folder
export async function saveFile(
  filename: string,
  type: "md" | "draw",
  content: string,
) {
  await ensureLunarscribeDirExists();

  const resolvedPath = resolvePath({ filename, type });
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    writeTextFile(resolvedPath, content, {
      baseDir: BaseDirectory.Document,
    }),
  );
  if (error) throw new Error(`Save failed: ${error}`);
  return filename;
}

// creates a new file with unique name
export async function createFile(type: "md" | "draw", content: string) {
  const filename = await getUniqueFilename({ filename: "untitled", type });
  await saveFile(filename, type, content);
  return filename;
}

// reads file content
export async function readFile(note: Pick<Note, "filename" | "type">) {
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
  if (!oldPath || !newPath) return note.filename;
  if (oldPath === newPath) return note.filename;

  const targetFilename = await getUniqueFilename({
    ...note,
    filename: newFilename,
  });
  const uniqueNewPath = resolvePath({ ...note, filename: targetFilename });
  if (!uniqueNewPath) return note.filename;

  const { error } = await tryCatch(
    rename(oldPath, uniqueNewPath, {
      oldPathBaseDir: BaseDirectory.Document,
      newPathBaseDir: BaseDirectory.Document,
    }),
  );
  if (error) throw new Error(`Rename failed: ${error}`);
  return targetFilename;
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

// lists files in lunarscribe dir
export async function listFiles() {
  await ensureLunarscribeDirExists();

  const { data: entries, error } = await tryCatch(
    readDir(LUNARSCRIBE_BASE_PATH, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`List failed: ${error}`);

  return (entries ?? [])
    .filter((e) => e.name?.endsWith(".md") || e.name?.endsWith(".draw"))
    .map((e) => e.name!);
}
