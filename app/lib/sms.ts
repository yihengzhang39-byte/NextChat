import { createHash, createHmac, randomInt, randomUUID } from "crypto";

export function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

export function maskPhone(phone: string) {
  const normalized = normalizePhone(phone);
  return normalized.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function isValidChinaMobile(phone: string) {
  return /^1[3-9]\d{9}$/.test(normalizePhone(phone));
}

export function createSmsCode() {
  return randomInt(100000, 999999).toString();
}

export function hashSmsCode(phone: string, code: string) {
  return createHash("sha256")
    .update(
      `${normalizePhone(phone)}:${code}:${
        process.env.SMS_CODE_SECRET ?? "dev-secret"
      }`,
    )
    .digest("hex");
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

function signAliyunSms(params: Record<string, string>, secret: string) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const stringToSign = `GET&%2F&${percentEncode(sorted)}`;
  return createHmac("sha1", `${secret}&`).update(stringToSign).digest("base64");
}

function logAliyunSmsFailure(
  phone: string,
  reason: string,
  providerCode?: string,
) {
  console.warn("[Auth] Aliyun SMS send failed", {
    phone: maskPhone(phone),
    reason,
    providerCode,
  });
}

export async function sendSmsCode(phone: string, code: string) {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  const paramKey = process.env.ALIYUN_SMS_TEMPLATE_PARAM_KEY || "code";

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    logAliyunSmsFailure(phone, "missing-env");
    throw new Error("SMS_SEND_FAILED");
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: normalizePhone(phone),
    RegionId: "cn-hangzhou",
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: randomUUID(),
    SignatureVersion: "1.0",
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ [paramKey]: code }),
    Timestamp: new Date().toISOString(),
    Version: "2017-05-25",
  };

  const signature = signAliyunSms(params, accessKeySecret);
  const searchParams = new URLSearchParams({
    ...params,
    Signature: signature,
  });

  try {
    const response = await fetch(
      `https://dysmsapi.aliyuncs.com/?${searchParams}`,
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.Code !== "OK") {
      logAliyunSmsFailure(phone, "provider-error", String(payload.Code ?? ""));
      throw new Error("SMS_SEND_FAILED");
    }
  } catch (err) {
    if (!(err instanceof Error && err.message === "SMS_SEND_FAILED")) {
      logAliyunSmsFailure(phone, "network-or-parse-error");
    }
    throw new Error("SMS_SEND_FAILED");
  }
}
