import { NextRequest, NextResponse } from "next/server";
import {
  claimIdentityVerification,
  completeIdentityVerification,
  failIdentityVerification,
  getIdentityRecord,
  toIdentityStatusResponse,
  unauthenticatedResponse,
  validateIdentityInput,
} from "@/app/lib/identity";
import {
  getIdentityVerificationProvider,
  type IdentityVerificationResponse,
} from "@/app/lib/identity-verification";
import { getCurrentUserFromRequest } from "@/app/lib/session";

export const runtime = "nodejs";

const messages: Record<string, string> = {
  invalid_real_name: "请输入正确的真实姓名",
  invalid_id_number: "请输入正确的 18 位居民身份证号码",
  identity_mismatch: "姓名与身份证号码不一致",
  invalid_idcard: "身份证号不符合规则，请重新输入",
  identity_service_unavailable: "实名认证服务暂时不可用，请稍后重试",
  identity_config_error: "实名认证服务配置异常，请联系管理员",
  rate_limited: "认证操作频繁，请稍后再试",
  verification_in_progress: "实名认证正在处理中，请稍候",
  already_verified: "您已完成实名认证",
  id_number_already_bound: "该身份证号码已绑定其他账号",
};

function error(reason: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: true, reason, message: messages[reason] ?? "实名认证失败，请稍后重试", ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return unauthenticatedResponse();

  const body = await req.json().catch(() => ({}));
  const input = validateIdentityInput(body);
  if (!input.success) return error(input.error, 400);
  const { realName, idNumber } = input;

  const current = await getIdentityRecord(user.id);
  if (current?.realNameStatus === "VERIFIED") return error("already_verified", 409);
  if (
    current?.realNameStatus === "VERIFYING" &&
    current.realNameLastAttemptAt &&
    Date.now() - current.realNameLastAttemptAt.getTime() < 5 * 60_000
  ) {
    return error("verification_in_progress", 409);
  }
  const claim = await claimIdentityVerification(user.id);
  if (!claim.claimed && claim.retryAfterSeconds) {
    console.warn("[identity verification]", { provider: "server", outcome: "rate_limited", retryAfterSeconds: claim.retryAfterSeconds });
    return error("rate_limited", 429, claim.retryAfterSeconds);
  }
  if (!claim.claimed) return error("verification_in_progress", 409);

  let result: IdentityVerificationResponse;
  try {
    result = await getIdentityVerificationProvider().verify({
      realName,
      idNumber,
      userId: user.id,
    });
  } catch {
    await failIdentityVerification(user.id, "identity_service_unavailable");
    return error("identity_service_unavailable", 503);
  }
  if (result.result !== "VERIFIED") {
    const reason =
      result.result === "MISMATCH"
        ? "identity_mismatch"
        : result.result === "SERVICE_UNAVAILABLE"
        ? "identity_service_unavailable"
        : result.result === "RATE_LIMITED"
        ? "rate_limited"
        : result.result === "INVALID_ID_NUMBER"
        ? "invalid_idcard"
        : "identity_config_error";
    await failIdentityVerification(
      user.id,
      reason,
      result.provider,
      result.requestId,
    );
    return error(
      reason,
      reason === "identity_service_unavailable"
        ? 503
        : reason === "identity_config_error"
        ? 500
        : reason === "rate_limited"
        ? 429
        : 400,
    );
  }

  try {
    await completeIdentityVerification({
      realName,
      idNumber,
      userId: user.id,
      provider: result.provider,
      requestId: result.requestId,
    });
  } catch (cause: unknown) {
    const databaseCode = (cause as { meta?: { code?: string } })?.meta?.code;
    const reason = databaseCode === "23505" ? "id_number_already_bound" : "identity_config_error";
    await failIdentityVerification(
      user.id,
      reason,
      result.provider,
      result.requestId,
    );
    return error(reason, databaseCode === "23505" ? 409 : 500);
  }

  const identity = await getIdentityRecord(user.id);
  return NextResponse.json({ error: false, ...toIdentityStatusResponse(identity!) });
}
