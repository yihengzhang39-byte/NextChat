import { NextRequest, NextResponse } from "next/server";
import {
  createChatStorageKey,
  getChatImageExtension,
  MAX_CHAT_IMAGE_BYTES,
  removeChatFile,
  writeChatFile,
} from "@/app/lib/chat-storage";
import { prisma } from "@/app/lib/db";
import { getCurrentUserFromRequest } from "@/app/lib/session";

export const runtime = "nodejs";

function isValidSessionId(id: string) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

function safeOriginalName(name: string) {
  return name.replace(/[\\/\x00-\x1f]/g, "").slice(0, 255) || null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: true, message: "未登录" },
      { status: 401 },
    );
  }

  const formData = await req.formData().catch(() => null);
  const sessionId = String(formData?.get("sessionId") ?? "");
  const file = formData?.get("file");
  if (!isValidSessionId(sessionId) || !file || typeof file === "string") {
    return NextResponse.json(
      { error: true, message: "上传参数无效" },
      { status: 400 },
    );
  }

  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json(
      { error: true, message: "会话不存在" },
      { status: 404 },
    );
  }

  if (!getChatImageExtension(file.type)) {
    return NextResponse.json(
      { error: true, message: "不支持的图片类型" },
      { status: 400 },
    );
  }
  if (file.size > MAX_CHAT_IMAGE_BYTES) {
    return NextResponse.json(
      { error: true, message: "图片不能超过 10MB" },
      { status: 413 },
    );
  }

  const storageKey = createChatStorageKey(user.id, session.id, file.type);
  if (!storageKey) {
    return NextResponse.json(
      { error: true, message: "不支持的图片类型" },
      { status: 400 },
    );
  }

  try {
    await writeChatFile(storageKey, Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    console.error("[Chat] failed to write image", {
      userId: user.id,
      sessionId: session.id,
    });
    return NextResponse.json(
      { error: true, message: "图片保存失败" },
      { status: 500 },
    );
  }

  try {
    const chatFile = await prisma.chatFile.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        storageKey,
        originalName: safeOriginalName(file.name),
        mimeType: file.type,
        size: file.size,
      },
    });
    return NextResponse.json({
      error: false,
      id: chatFile.id,
      url: `/api/chat/files/${chatFile.id}`,
      mimeType: chatFile.mimeType,
      size: chatFile.size,
    });
  } catch (error) {
    try {
      await removeChatFile(storageKey);
    } catch (cleanupError) {
      console.error("[Chat] failed to remove orphan image", {
        userId: user.id,
        sessionId: session.id,
      });
    }
    console.error("[Chat] failed to save image metadata", {
      userId: user.id,
      sessionId: session.id,
    });
    return NextResponse.json(
      { error: true, message: "图片元数据保存失败" },
      { status: 500 },
    );
  }
}
