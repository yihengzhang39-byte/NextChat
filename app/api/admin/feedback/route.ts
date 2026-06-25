import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { error: true, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json({ error: false, feedbacks });
}
