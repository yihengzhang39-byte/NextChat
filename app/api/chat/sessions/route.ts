import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getCurrentUserFromRequest } from "@/app/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: true, message: "未登录" },
      { status: 401 },
    );
  }

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        model: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ error: false, sessions });
  } catch (error) {
    console.error("[Chat] failed to load sessions", { userId: user.id });
    return NextResponse.json(
      { error: true, message: "聊天记录加载失败" },
      { status: 500 },
    );
  }
}
