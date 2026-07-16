import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/app/lib/session";
import { getIdentityRecord } from "@/app/lib/identity";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const identity = await getIdentityRecord(user.id);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      phone: user.phone,
      acceptedTerms: user.acceptedTerms,
      realNameStatus: identity?.realNameStatus ?? "UNVERIFIED",
    },
  });
}
