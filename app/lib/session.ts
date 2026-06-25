import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "iflytek_chat_session";
const SESSION_TTL_DAYS = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getUserByToken(token);
}

export async function getCurrentUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return getUserByToken(token);
}

async function getUserByToken(token?: string) {
  if (!token) return null;

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function clearCurrentSession(req?: NextRequest) {
  const token =
    req?.cookies.get(SESSION_COOKIE)?.value ?? cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.userSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookies().delete(SESSION_COOKIE);
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}
