import { NextRequest, NextResponse } from "next/server";
import { getUserChatAccess, toIdentityStatusResponse, unauthenticatedResponse } from "@/app/lib/identity";
import { getCurrentUserFromRequest } from "@/app/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return unauthenticatedResponse();

  const access = await getUserChatAccess(user.id);
  if (!access.record) {
    return NextResponse.json({ error: true, message: "用户不存在" }, { status: 404 });
  }
  return NextResponse.json({ error: false, ...toIdentityStatusResponse(access.record, access) });
}
