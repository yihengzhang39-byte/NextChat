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

  const recentCount = await prisma.smsCode.count({
    where: {
      phone,
      purpose: "login",
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });

  if (recentCount > 0) {
    return NextResponse.json(
      { error: true, message: "验证码发送过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  const code = process.env.SMS_MOCK_CODE || createSmsCode();
  const result = await sendSmsCode(phone, code);

  await prisma.smsCode.create({
    data: {
      phone,
      codeHash: hashSmsCode(phone, code),
      purpose: "login",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      ip: getRequestIp(req),
      userAgent: getUserAgent(req),
    },
  });

  return NextResponse.json({
    error: false,
    mocked: result.mocked,
    mockCode: result.mocked ? result.code : undefined,
    message: result.mocked ? "开发环境验证码已生成" : "验证码已发送",
  });
}
