import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import {
  buildUserSession,
  setBuiltSessionCookie,
  upsertAcceptedPhoneUser,
} from "@/app/lib/phone-login";
import { hashSmsCode, isValidChinaMobile, normalizePhone } from "@/app/lib/sms";

export const runtime = "nodejs";

function codeError(reason: string, message: string) {
  return NextResponse.json({ error: true, reason, message }, { status: 401 });
}

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
    },
    orderBy: { createdAt: "desc" },
  });

  if (!smsCode) {
    return codeError("not_found", "验证码错误");
  }

  const now = new Date();

  if (smsCode.consumedAt) {
    return codeError("used_code", "验证码错误");
  }

  if (smsCode.expiresAt <= now) {
    return codeError("expired_code", "验证码已超时，请重新获取");
  }

  if (smsCode.failedAttempts >= 5) {
    return codeError("too_many_attempts", "验证码错误");
  }

  if (smsCode.codeHash !== hashSmsCode(phone, code)) {
    const failedAttempts = smsCode.failedAttempts + 1;
    await prisma.smsCode.updateMany({
      where: { id: smsCode.id, consumedAt: null, failedAttempts: { lt: 5 } },
      data: {
        failedAttempts: { increment: 1 },
        ...(failedAttempts >= 5 ? { consumedAt: new Date() } : {}),
      },
    });

    return codeError("invalid_code", "验证码错误");
  }

  const user = await upsertAcceptedPhoneUser(phone);
  const session = buildUserSession(req, user.id);

  const consumed = await prisma.$transaction(async (tx) => {
    const result = await tx.smsCode.updateMany({
      where: {
        id: smsCode.id,
        codeHash: smsCode.codeHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        failedAttempts: { lt: 5 },
      },
      data: { consumedAt: new Date(), userId: user.id },
    });

    if (result.count === 0) return false;

    await tx.userSession.create({ data: session.data });
    return true;
  });

  if (!consumed) {
    return codeError("invalid_code", "验证码错误");
  }

  setBuiltSessionCookie(session);

  return NextResponse.json({
    error: false,
    user: {
      id: user.id,
      phone: user.phone,
      acceptedTerms: user.acceptedTerms,
    },
  });
}
