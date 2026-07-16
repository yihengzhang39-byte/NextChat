import { Prisma } from "@/app/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getCurrentVerifiedUser } from "@/app/lib/identity";
import { removeChatSessionFiles } from "@/app/lib/chat-storage";
import { sanitizeChatSnapshot } from "@/app/utils/chat-snapshot";

export const runtime = "nodejs";

function isValidSessionId(id: string) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

async function currentUser(req: NextRequest) {
  return getCurrentVerifiedUser(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const access = await currentUser(req);
  if (access.response) return access.response;
  const user = access.user!;

  const session = await prisma.chatSession.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!session) {
    return NextResponse.json(
      { error: true, message: "会话不存在" },
      { status: 404 },
    );
  }

  return NextResponse.json({ error: false, session });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const access = await currentUser(req);
  if (access.response) return access.response;
  const user = access.user!;
  if (!isValidSessionId(params.id)) {
    return NextResponse.json(
      { error: true, message: "会话 ID 无效" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: true, message: "会话数据无效" },
      { status: 400 },
    );
  }

  let data: Record<string, unknown>;
  try {
    data = sanitizeChatSnapshot((body as { data?: unknown }).data);
  } catch {
    return NextResponse.json(
      { error: true, message: "会话数据无效" },
      { status: 400 },
    );
  }

  const requestedTitle = String(
    (body as { title?: unknown }).title ?? "",
  ).trim();
  const title = (requestedTitle || String(data.topic ?? "新聊天")).slice(
    0,
    255,
  );
  const requestedModel = (body as { model?: unknown }).model;
  const model =
    typeof requestedModel === "string" ? requestedModel.slice(0, 255) : null;
  data.id = params.id;
  data.topic = title;

  try {
    const ownSession = await prisma.chatSession.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    });

    if (!ownSession) {
      const existing = await prisma.chatSession.findUnique({
        where: { id: params.id },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: true, message: "会话不存在" },
          { status: 404 },
        );
      }
    }

    const session = ownSession
      ? await prisma.chatSession.update({
          where: { id: ownSession.id },
          data: { title, model, data: data as Prisma.InputJsonValue },
        })
      : await prisma.chatSession.create({
          data: {
            id: params.id,
            userId: user.id,
            title,
            model,
            data: data as Prisma.InputJsonValue,
          },
        });

    return NextResponse.json({ error: false, session });
  } catch (error) {
    console.error("[Chat] failed to save session", {
      userId: user.id,
      sessionId: params.id,
    });
    return NextResponse.json(
      { error: true, message: "聊天记录保存失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const access = await currentUser(req);
  if (access.response) return access.response;
  const user = access.user!;

  const session = await prisma.chatSession.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json(
      { error: true, message: "会话不存在" },
      { status: 404 },
    );
  }

  try {
    await prisma.chatSession.delete({ where: { id: session.id } });
  } catch (error) {
    console.error("[Chat] failed to delete session", {
      userId: user.id,
      sessionId: session.id,
    });
    return NextResponse.json(
      { error: true, message: "聊天记录删除失败" },
      { status: 500 },
    );
  }

  try {
    await removeChatSessionFiles(user.id, session.id);
  } catch (error) {
    console.error("[Chat] failed to clean session files", {
      userId: user.id,
      sessionId: session.id,
    });
  }

  return NextResponse.json({ error: false });
}
