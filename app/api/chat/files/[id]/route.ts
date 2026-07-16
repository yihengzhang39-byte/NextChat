import { NextRequest, NextResponse } from "next/server";
import { readChatFile } from "@/app/lib/chat-storage";
import { prisma } from "@/app/lib/db";
import { getCurrentVerifiedUser } from "@/app/lib/identity";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const access = await getCurrentVerifiedUser(req);
  if (access.response) return access.response;
  const user = access.user!;

  const chatFile = await prisma.chatFile.findFirst({
    where: { id: params.id, userId: user.id },
    select: { storageKey: true, mimeType: true },
  });
  if (!chatFile) {
    return NextResponse.json(
      { error: true, message: "文件不存在" },
      { status: 404 },
    );
  }

  try {
    const file = await readChatFile(chatFile.storageKey);
    if (!file) {
      return NextResponse.json(
        { error: true, message: "文件不存在" },
        { status: 404 },
      );
    }
    return new NextResponse(file, {
      headers: {
        "Content-Type": chatFile.mimeType,
        "Content-Length": String(file.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return NextResponse.json(
        { error: true, message: "文件不存在" },
        { status: 404 },
      );
    }
    console.error("[Chat] failed to read image", { fileId: params.id });
    return NextResponse.json(
      { error: true, message: "文件读取失败" },
      { status: 500 },
    );
  }
}
