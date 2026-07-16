import { createHmac, randomUUID } from "crypto";
import type {
  IdentityVerificationProvider,
  IdentityVerificationResponse,
} from "../identity-verification";

const provider = "aliyun_market";
const accept = "application/json";
const contentType = "application/x-www-form-urlencoded; charset=UTF-8";
const signatureMethod = "HmacSHA256";

type ProviderConfig = {
  appKey: string;
  appSecret: string;
  endpoint: URL;
  timeoutMs: number;
};

function getConfig(): ProviderConfig | null {
  const appKey = process.env.IDENTITY_VERIFY_ALIYUN_MARKET_APP_KEY?.trim();
  const appSecret = process.env.IDENTITY_VERIFY_ALIYUN_MARKET_APP_SECRET?.trim();
  const host =
    process.env.IDENTITY_VERIFY_ALIYUN_MARKET_HOST?.trim() ||
    "https://checkone.market.alicloudapi.com";
  const path =
    process.env.IDENTITY_VERIFY_ALIYUN_MARKET_PATH?.trim() ||
    "/communication/personal/10101";
  const timeoutValue = process.env.IDENTITY_VERIFY_ALIYUN_MARKET_TIMEOUT_MS;
  const timeoutMs = timeoutValue ? Number(timeoutValue) : 15_000;

  if (!appKey || !appSecret || !Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return null;
  }

  try {
    const endpoint = new URL(path, host);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      return null;
    }
    return { appKey, appSecret, endpoint, timeoutMs };
  } catch {
    return null;
  }
}

function signRequest(config: ProviderConfig, form: [string, string][]) {
  const timestamp = String(Date.now());
  const signingHeaders = {
    "x-ca-key": config.appKey,
    "x-ca-nonce": randomUUID(),
    "x-ca-signature-method": signatureMethod,
    "x-ca-timestamp": timestamp,
  };
  const headerNames = Object.keys(signingHeaders).sort();
  const canonicalHeaders = headerNames
    .map((name) => `${name}:${signingHeaders[name as keyof typeof signingHeaders]}\n`)
    .join("");
  const parameters = form
    .map(([name, value]) => (value ? `${name}=${value}` : name))
    .join("&");
  const pathAndParameters = parameters
    ? `${config.endpoint.pathname}?${parameters}`
    : config.endpoint.pathname;
  const stringToSign = [
    "POST",
    accept,
    "",
    contentType,
    "",
    `${canonicalHeaders}${pathAndParameters}`,
  ].join("\n");
  const signature = createHmac("sha256", config.appSecret)
    .update(stringToSign, "utf8")
    .digest("base64");

  return {
    Accept: accept,
    "Content-Type": contentType,
    "X-Ca-Key": signingHeaders["x-ca-key"],
    "X-Ca-Nonce": signingHeaders["x-ca-nonce"],
    "X-Ca-Signature-Method": signatureMethod,
    "X-Ca-Timestamp": timestamp,
    "X-Ca-Signature-Headers": headerNames.join(","),
    "X-Ca-Signature": signature,
  };
}

function serviceUnavailable(requestId?: string): IdentityVerificationResponse {
  return { result: "SERVICE_UNAVAILABLE", provider, requestId };
}

function logFailure(input: {
  outcome: string;
  durationMs: number;
  httpStatus?: number;
  requestId?: string;
  businessCode?: string;
  resultSource?: string;
  resultType?: string;
  normalizedResult?: string;
}) {
  console.warn("[identity verification]", { provider, ...input });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

type ParsedResultValue = {
  resultType: string;
  normalizedResult?: "1" | "2" | "3";
  outcome?: string;
};

function resultValue(value: unknown): ParsedResultValue {
  const resultType = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (typeof value !== "string" && typeof value !== "number") {
    return { resultType, outcome: "invalid_result_type" };
  }
  const normalizedResult = String(value);
  if (normalizedResult !== "1" && normalizedResult !== "2" && normalizedResult !== "3") {
    return { resultType, outcome: "unknown_result" };
  }
  return { resultType, normalizedResult };
}

export function parseAliyunMarketResponse(payload: unknown) {
  const fail = (outcome: string, extra: Record<string, string> = {}) => ({
    response: serviceUnavailable(),
    outcome,
    ...extra,
  });
  if (!isRecord(payload)) return fail("invalid_json");
  const businessCode = typeof payload.code === "string" ? payload.code : undefined;
  if (payload.code === "SYSTEM_042") {
    return { response: { result: "INVALID_ID_NUMBER" as const, provider }, outcome: "invalid_idcard", businessCode };
  }
  if (payload.code !== "10000") return fail("provider_business_error", businessCode ? { businessCode } : {});
  const data = payload.data;
  const hasTopResult = Object.prototype.hasOwnProperty.call(payload, "result");
  if (data === undefined && hasTopResult) {
    const legacy = resultValue(payload.result);
    if (!legacy.normalizedResult) return fail(legacy.outcome!, { resultSource: "result", resultType: legacy.resultType });
    return parsedResult(legacy, "result");
  }
  if (!isRecord(data)) return fail("missing_data");
  if (!Object.prototype.hasOwnProperty.call(data, "result")) return fail("missing_result");
  const parsed = resultValue(data.result);
  const top = hasTopResult ? resultValue(payload.result) : undefined;
  if (top && top.normalizedResult !== parsed.normalizedResult) return fail("conflicting_result");
  if (!parsed.normalizedResult) return fail(parsed.outcome!, { resultSource: "data.result", resultType: parsed.resultType });
  return parsedResult(parsed, "data.result");
}

function parsedResult(parsed: ParsedResultValue, resultSource: string) {
  const details = { resultSource, resultType: parsed.resultType, normalizedResult: parsed.normalizedResult! };
  if (parsed.normalizedResult === "1") return { response: { result: "VERIFIED" as const, provider }, outcome: "verified", ...details };
  if (parsed.normalizedResult === "2") return { response: { result: "MISMATCH" as const, provider }, outcome: "mismatch", ...details };
  return { response: serviceUnavailable(), outcome: "provider_result_3", ...details };
}

export class AliyunMarketIdentityVerificationProvider
  implements IdentityVerificationProvider
{
  async verify(input: {
    realName: string;
    idNumber: string;
    userId: string;
  }): Promise<IdentityVerificationResponse> {
    const config = getConfig();
    if (!config) return { result: "CONFIG_ERROR", provider };

    const form = [
      ["idcard", input.idNumber],
      ["name", input.realName],
    ] as [string, string][];
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    let response: Response;

    try {
      response = await fetch(config.endpoint, {
        method: "POST",
        headers: signRequest(config, form),
        body: new URLSearchParams(form),
        signal: controller.signal,
      });
    } catch {
      logFailure({
        outcome: controller.signal.aborted ? "timeout" : "network",
        durationMs: Date.now() - startedAt,
      });
      return serviceUnavailable();
    } finally {
      clearTimeout(timeout);
    }

    const requestId = response.headers.get("x-ca-request-id") ?? undefined;
    if (!response.ok) {
      logFailure({
        outcome: "http_error",
        durationMs: Date.now() - startedAt,
        httpStatus: response.status,
        requestId,
      });
      return serviceUnavailable(requestId);
    }

    const payload: unknown = await response.json().catch(() => undefined);
    const parsed = parseAliyunMarketResponse(payload);
    const payloadRecord = isRecord(payload) ? payload : null;
    const seqNo = payloadRecord && typeof payloadRecord.seqNo === "string" ? payloadRecord.seqNo : undefined;
    const resolvedRequestId = requestId ?? seqNo;
    const details = parsed as {
      businessCode?: string;
      resultSource?: string;
      resultType?: string;
      normalizedResult?: string;
    };
    logFailure({
      outcome: parsed.outcome,
      durationMs: Date.now() - startedAt,
      httpStatus: response.status,
      requestId: resolvedRequestId,
      ...(details.businessCode ? { businessCode: details.businessCode } : {}),
      ...(details.resultSource
        ? {
            resultSource: details.resultSource,
            resultType: details.resultType,
            normalizedResult: details.normalizedResult,
          }
        : {}),
    });
    return { ...parsed.response, requestId: resolvedRequestId };
  }
}
