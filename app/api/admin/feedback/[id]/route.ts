import { NextRequest, NextResponse } from "next/server";
import { FeedbackStatus } from "@/app/generated/prisma";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { error: true, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "");
  const adminNote = String(body.adminNote ?? "").trim();

  if (!Object.values(FeedbackStatus).includes(status as FeedbackStatus)) {
    return NextResponse.json(
      { error: true, message: "Invalid status" },
      { status: 400 },
    );
  }

  const feedback = await prisma.feedback.update({
    where: { id: params.id },
    data: {
      status: status as FeedbackStatus,
      adminNote,
    },
  });

  return NextResponse.json({ error: false, feedback });
}
