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

// writes text to file
export async function writeFile(path: string, content: string) {
  const { data, error } = await tryCatch(
    writeTextFile(path, content, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Write failed: ${error}`);
  return data;
}

// reads text from file
export async function readFile(path: string) {
  const { data, error } = await tryCatch(
    readTextFile(path, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Read failed: ${error}`);
  return data;
}

// renames a file
export async function renameFile(oldPath: string, newPath: string) {
  const { data, error } = await tryCatch(
    rename(oldPath, newPath, {
      oldPathBaseDir: BaseDirectory.Document,
      newPathBaseDir: BaseDirectory.Document,
    }),
  );
  if (error) throw new Error(`Rename failed: ${error}`);
  return data;
}

// deletes a file
export async function deleteFile(path: string) {
  const { data, error } = await tryCatch(
    remove(path, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Delete failed: ${error}`);
  return data;
}

// checks if file exists
export async function fileExists(path: string) {
  const { data, error } = await tryCatch(
    exists(path, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Exists check failed: ${error}`);
  return data;
}

// creates a directory
export async function createDir(path: string) {
  const { data, error } = await tryCatch(
    mkdir(path, { baseDir: BaseDirectory.Document }),
  );
  if (error) throw new Error(`Mkdir failed: ${error}`);
  return data;
}
