import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getRequestIp, getUserAgent } from "@/app/lib/request";
import { hashSmsCode, isValidChinaMobile, normalizePhone } from "@/app/lib/sms";
import {
  createSessionToken,
  hashToken,
  sessionExpiresAt,
  setSessionCookie,
} from "@/app/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const code = String(body.code ?? "").trim();
  const acceptedTerms = Boolean(body.acceptedTerms);

  if (!isValidChinaMobile(phone)) {
    return NextResponse.json(
      { error: true, message: "请输入正确的手机号" },
      { status: 400 },
    );
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: true, message: "请输入 6 位验证码" },
      { status: 400 },
    );
  }

  if (!acceptedTerms) {
    return NextResponse.json(
      { error: true, message: "请先阅读并同意用户协议和隐私政策" },
      { status: 400 },
    );
  }

  const smsCode = await prisma.smsCode.findFirst({
    where: {
      phone,
      purpose: "login",
      codeHash: hashSmsCode(phone, code),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!smsCode) {
    return NextResponse.json(
      { error: true, message: "验证码错误或已过期" },
      { status: 401 },
    );
  }

  const user = await prisma.user.upsert({
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

  const token = createSessionToken();
  const expiresAt = sessionExpiresAt();

  await prisma.$transaction([
    prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { consumedAt: new Date(), userId: user.id },
    }),
    prisma.userSession.create({
      data: {
        tokenHash: hashToken(token),
        expiresAt,
        ip: getRequestIp(req),
        userAgent: getUserAgent(req),
        userId: user.id,
      },
    }),
  ]);

  setSessionCookie(token, expiresAt);

  return NextResponse.json({
    error: false,
    user: {
      id: user.id,
      phone: user.phone,
      acceptedTerms: user.acceptedTerms,
    },
  });
}
