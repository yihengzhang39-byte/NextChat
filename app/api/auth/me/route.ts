import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/app/lib/session";
import { getUserChatAccess } from "@/app/lib/identity";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const access = await getUserChatAccess(user.id);

  return NextResponse.json({
    authenticated: true,
    identityVerificationStatus: access.identityVerificationStatus,
    ageVerificationStatus: access.ageVerificationStatus,
    canUseChat: access.canUseChat,
    ...(access.reason ? { reason: access.reason } : {}),
    user: {
      id: user.id,
      phone: user.phone,
      acceptedTerms: user.acceptedTerms,
      realNameStatus: access.identityVerificationStatus,
      ageVerificationStatus: access.ageVerificationStatus,
      canUseChat: access.canUseChat,
    },
  });
}
