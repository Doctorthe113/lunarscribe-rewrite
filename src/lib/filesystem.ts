import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  remove,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
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
function resolvePath(filename: string, filetype?: FileType) {
  const trimmedName = filename.trim() || "untitled";
  const nameWithoutExtension = trimmedName.replace(/\.[^/.]+$/, "");
  const extensionFromName = trimmedName.includes(".")
    ? (trimmedName.split(".").pop() ?? "")
    : "";
  const finalExtension = filetype ?? extensionFromName;
  if (finalExtension !== "md" && finalExtension !== "draw") return null;
  return `${LUNARSCRIBE_BASE_PATH}/${nameWithoutExtension}.${finalExtension}`;
}

// gets unique filename by adding suffix
export async function getUniqueFilename(filename: string, filetype?: FileType) {
  const resolvedPath = resolvePath(filename, filetype);
  if (!resolvedPath) return filename;

  const { data: isTaken } = await tryCatch(
    exists(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (!isTaken) return filename;

  const nameWithoutExtension = filename.trim().replace(/\.[^/.]+$/, "");
  const extensionFromName = filename.includes(".")
    ? (filename.split(".").pop() ?? "")
    : "";
  const ext = filetype ?? extensionFromName;

  let suffix = 1;
  while (true) {
    const candidateName = `${nameWithoutExtension}(${suffix})`;
    const candidatePath = resolvePath(candidateName, ext as FileType);
    const { data: taken } = await tryCatch(
      exists(candidatePath!, { baseDir: BaseDirectory.Document }),
    );
    if (!taken) return `${candidateName}.${ext}`;
    suffix += 1;
  }
}

// writes file in lunarscribe folder
export async function writeFile(
  filename: string,
  content: string,
  filetype?: FileType,
) {
  await ensureLunarscribeDirExists();

  const resolvedPath = resolvePath(filename, filetype);
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    writeTextFile(resolvedPath, content, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Write failed: ${error}`);
  return resolvedPath;
}

// reads file text only
export async function readFile(filename: string, filetype?: FileType) {
  const resolvedPath = resolvePath(filename, filetype);
  if (!resolvedPath) return;

  const { data, error } = await tryCatch(
    readTextFile(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Read failed: ${error}`);
  return data ?? "";
}

// renames with duplicate suffix
export async function renameFile(
  oldFilename: string,
  newFilename: string,
  filetype?: FileType,
) {
  const oldPath = resolvePath(oldFilename, filetype);
  const newPath = resolvePath(newFilename, filetype);
  if (!oldPath || !newPath) return;
  if (oldPath === newPath) return newPath;

  const targetFilename = await getUniqueFilename(newFilename, filetype);
  const uniqueNewPath = resolvePath(targetFilename, filetype);
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
export async function deleteFile(filename: string, filetype?: FileType) {
  const resolvedPath = resolvePath(filename, filetype);
  if (!resolvedPath) return;

  const { error } = await tryCatch(
    remove(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Delete failed: ${error}`);
  return true;
}

// checks file existence boolean
export async function fileExists(filename: string, filetype?: FileType) {
  const resolvedPath = resolvePath(filename, filetype);
  if (!resolvedPath) return false;

  const { data, error } = await tryCatch(
    exists(resolvedPath, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Exists check failed: ${error}`);
  return Boolean(data);
}
