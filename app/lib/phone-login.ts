import { NextRequest } from "next/server";
import { prisma } from "./db";
import { getRequestIp, getUserAgent } from "./request";
import {
  createSessionToken,
  hashToken,
  sessionExpiresAt,
  setSessionCookie,
} from "./session";

export async function upsertAcceptedPhoneUser(phone: string) {
  return prisma.user.upsert({
    where: { phone },
    update: {
      acceptedTerms: true,
      acceptedAt: new Date(),
    },
    create: {
      phone,
      acceptedTerms: true,
      acceptedAt: new Date(),
    },
  });
}

export function buildUserSession(req: NextRequest, userId: string) {
  const token = createSessionToken();
  const expiresAt = sessionExpiresAt();

  return {
    token,
    expiresAt,
    data: {
      tokenHash: hashToken(token),
      expiresAt,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req),
      userId,
    },
  };
}

export function setBuiltSessionCookie(
  session: ReturnType<typeof buildUserSession>,
) {
  setSessionCookie(session.token, session.expiresAt);
}

export async function loginPhoneUser(req: NextRequest, phone: string) {
  const user = await upsertAcceptedPhoneUser(phone);
  const session = buildUserSession(req, user.id);

  await prisma.userSession.create({ data: session.data });
  setBuiltSessionCookie(session);

  return user;
}
