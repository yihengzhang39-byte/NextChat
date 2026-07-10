import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;

export function getChatImageExtension(mimeType: string) {
  return MIME_EXTENSIONS[mimeType];
}

function uploadRoot() {
  return path.resolve(
    process.env.CHAT_UPLOAD_DIR ||
      path.join(process.cwd(), "data", "chat-uploads"),
  );
}

function storagePath(storageKey: string) {
  const normalized = path.posix.normalize(storageKey);
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    return null;
  }

  const root = uploadRoot();
  const target = path.resolve(root, ...normalized.split("/"));
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

export function createChatStorageKey(
  userId: string,
  sessionId: string,
  mimeType: string,
) {
  const extension = getChatImageExtension(mimeType);
  if (!extension) return null;
  return path.posix.join(userId, sessionId, `${randomUUID()}.${extension}`);
}

export async function writeChatFile(storageKey: string, bytes: Buffer) {
  const filePath = storagePath(storageKey);
  if (!filePath) throw new Error("invalid chat file storage key");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes, { flag: "wx" });
}

export async function readChatFile(storageKey: string) {
  const filePath = storagePath(storageKey);
  if (!filePath) return null;
  return fs.readFile(filePath);
}

export async function removeChatFile(storageKey: string) {
  const filePath = storagePath(storageKey);
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
}

export async function removeChatSessionFiles(
  userId: string,
  sessionId: string,
) {
  const filePath = storagePath(
    path.posix.join(userId, sessionId, "placeholder"),
  );
  if (!filePath) return;
  await fs.rm(path.dirname(filePath), { recursive: true, force: true });
}
