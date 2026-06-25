import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getCurrentUserFromRequest } from "@/app/lib/session";
import { getUserAgent } from "@/app/lib/request";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "").trim();
  const content = String(body.content ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  const pageUrl = String(body.pageUrl ?? "").trim();

  if (!type || !content) {
    return NextResponse.json(
      { error: true, message: "请选择反馈类型并填写反馈内容" },
      { status: 400 },
    );
  }

  if (content.length > 2000) {
    return NextResponse.json(
      { error: true, message: "反馈内容不能超过 2000 字" },
      { status: 400 },
    );
  }

  const feedback = await prisma.feedback.create({
    data: {
      type,
      content,
      contact: contact || user?.phone || null,
      pageUrl: pageUrl || null,
      userAgent: getUserAgent(req),
      userId: user?.id,
    },
  });

  return NextResponse.json({ error: false, feedbackId: feedback.id });
}
