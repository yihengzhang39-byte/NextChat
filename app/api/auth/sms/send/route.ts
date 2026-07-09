import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getRequestIp, getUserAgent } from "@/app/lib/request";
import {
  createSmsCode,
  hashSmsCode,
  isValidChinaMobile,
  normalizePhone,
  sendSmsCode,
} from "@/app/lib/sms";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));

  if (!isValidChinaMobile(phone)) {
    return NextResponse.json(
      { error: true, message: "请输入正确的手机号" },
      { status: 400 },
    );
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [recentCount, todayCount] = await Promise.all([
    prisma.smsCode.count({
      where: {
        phone,
        purpose: "login",
        createdAt: { gte: new Date(now.getTime() - 60 * 1000) },
      },
    }),
    prisma.smsCode.count({
      where: {
        phone,
        purpose: "login",
        createdAt: { gte: today },
      },
    }),
  ]);

  if (recentCount > 0) {
    return NextResponse.json(
      { error: true, message: "验证码发送过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  if (todayCount >= 10) {
    return NextResponse.json(
      { error: true, message: "今日验证码发送次数已达上限" },
      { status: 429 },
    );
  }

  const code = createSmsCode();

  try {
    await sendSmsCode(phone, code);
  } catch {
    return NextResponse.json(
      { error: true, message: "验证码发送失败，请稍后重试" },
      { status: 502 },
    );
  }

  await prisma.$transaction([
    prisma.smsCode.updateMany({
      where: { phone, purpose: "login", consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.smsCode.create({
      data: {
        phone,
        codeHash: hashSmsCode(phone, code),
        purpose: "login",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        ip: getRequestIp(req),
        userAgent: getUserAgent(req),
      },
    }),
  ]);

  return NextResponse.json({
    error: false,
    message: "验证码已发送",
  });
}
