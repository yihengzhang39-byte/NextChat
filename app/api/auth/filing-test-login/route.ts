import { NextRequest, NextResponse } from "next/server";
import { loginPhoneUser } from "@/app/lib/phone-login";
import { isValidChinaMobile, normalizePhone } from "@/app/lib/sms";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (process.env.FILING_TEST_LOGIN_ENABLED !== "true") {
    return NextResponse.json(
      { error: true, message: "备案测试登录未开启" },
      { status: 403 },
    );
  }

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

  if (code !== (process.env.FILING_TEST_LOGIN_CODE ?? "123456")) {
    return NextResponse.json(
      { error: true, message: "验证码错误" },
      { status: 401 },
    );
  }

  const user = await loginPhoneUser(req, phone);

  return NextResponse.json({
    error: false,
    user: {
      id: user.id,
      phone: user.phone,
      acceptedTerms: user.acceptedTerms,
    },
  });
}
