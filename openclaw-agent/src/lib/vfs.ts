import { get, set, keys, del } from "idb-keyval";

// All virtual files are namespaced with this prefix inside IndexedDB,
// so this app's data never collides with anything else.
const PREFIX = "vfs:";

export interface VFile {
  path: string;
  content: string;
  updatedAt: number;
}

function key(path: string) {
  return PREFIX + normalize(path);
}

function normalize(path: string) {
  // Force forward slashes, strip leading slash, collapse "./"
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
}

export async function writeFile(path: string, content: string): Promise<VFile> {
  const file: VFile = { path: normalize(path), content, updatedAt: Date.now() };
  await set(key(path), file);
  return file;
}

export async function readFile(path: string): Promise<VFile | null> {
  const file = await get(key(path));
  return file ?? null;
}

export async function deleteFile(path: string): Promise<void> {
  await del(key(path));
}

export async function listFiles(): Promise<string[]> {
  const allKeys = await keys();
  return allKeys
    .filter((k): k is string => typeof k === "string" && k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length))
    .sort();
}

export async function readAllFiles(): Promise<VFile[]> {
  const paths = await listFiles();
  const files = await Promise.all(paths.map((p) => readFile(p)));
  return files.filter((f): f is VFile => f !== null);
}

export async function clearAllFiles(): Promise<void> {
  const paths = await listFiles();
  await Promise.all(paths.map((p) => deleteFile(p)));
}
