import { NextRequest, NextResponse } from "next/server";
import { clearCurrentSession } from "@/app/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await clearCurrentSession(req);
  return NextResponse.json({ error: false });
}
