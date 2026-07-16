import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from "crypto";
import { Prisma } from "@/app/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";
import { getCurrentUserFromRequest } from "./session";

export type RealNameStatus = "UNVERIFIED" | "VERIFYING" | "VERIFIED" | "FAILED";
export type AgeVerificationStatus = "UNKNOWN" | "ADULT" | "MINOR";
export type IdentityVerificationSource =
  | "ALIYUN_MARKET"
  | "FILING_TEST"
  | "MOCK";

export type IdentityInputValidationResult =
  | { success: false; error: "invalid_real_name" | "invalid_id_number" }
  | { success: true; realName: string; idNumber: string; mockAge?: MockAgeVerification };

type IdentityRecord = {
  realNameStatus: RealNameStatus;
  realNameCiphertext: string | null;
  idNumberLast4: string | null;
  realNameVerifiedAt: Date | null;
  realNameVerifyProvider: string | null;
  realNameLastAttemptAt: Date | null;
  ageVerificationStatus: AgeVerificationStatus;
  ageVerifiedAt: Date | null;
  adultEligibleAt: Date | null;
  identityVerificationSource: IdentityVerificationSource | null;
};

export type BirthDate = { year: number; month: number; day: number };

export type MockAgeVerification = {
  ageVerificationStatus: "ADULT" | "MINOR";
  adultEligibleAt: Date;
};

export type UserChatAccess = {
  identityVerificationStatus: RealNameStatus;
  ageVerificationStatus: AgeVerificationStatus;
  canUseChat: boolean;
  reason?: "real_name_required" | "underage_restricted" | "age_verification_required";
  record: IdentityRecord | null;
};

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const MOCK_TEST_ID_NUMBER = "111111111111111111";

function identityConfigError() {
  return new Error("identity_config_error");
}

function encryptionKey() {
  const value = process.env.IDENTITY_DATA_ENCRYPTION_KEY;
  const key = value ? Buffer.from(value, "base64") : Buffer.alloc(0);
  if (key.length !== 32) throw identityConfigError();
  return key;
}

function hmacKey() {
  const key = process.env.IDENTITY_ID_NUMBER_HMAC_KEY;
  if (!key) throw identityConfigError();
  return key;
}

export function encryptIdentityValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptIdentityValue(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted || version !== "v1") throw identityConfigError();
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function hmacIdNumber(idNumber: string) {
  return createHmac("sha256", hmacKey()).update(idNumber, "utf8").digest("hex");
}

export type IdNumberValidationResult = {
  success: boolean;
  normalized: string;
  failureStage?:
    | "empty"
    | "invalid_length"
    | "invalid_pattern"
    | "invalid_birth_date"
    | "invalid_checksum";
  normalizedLength: number;
  basicPatternValid: boolean;
  birthDateValid: boolean;
  checksumValid: boolean;
  trimApplied: boolean;
  lowercaseXNormalized: boolean;
  regionValidationApplied: false;
};

export function validateIdNumber(value: unknown): IdNumberValidationResult {
  const isString = typeof value === "string";
  const source = isString ? value : "";
  const trimmed = source.trim();
  const normalized = trimmed.toUpperCase();
  const trimApplied = source !== trimmed;
  const lowercaseXNormalized = trimmed.endsWith("x");

  const result = (
    failureStage: IdNumberValidationResult["failureStage"],
    basicPatternValid = false,
    birthDateValid = false,
    checksumValid = false,
  ): IdNumberValidationResult => ({
    success: false,
    normalized,
    failureStage,
    normalizedLength: normalized.length,
    basicPatternValid,
    birthDateValid,
    checksumValid,
    trimApplied,
    lowercaseXNormalized,
    regionValidationApplied: false,
  });

  if (!isString || !normalized) return result("empty");
  if (normalized.length !== 18) return result("invalid_length");
  if (!/^[0-9]{17}[0-9X]$/.test(normalized)) return result("invalid_pattern");

  const birthDate = parseIdBirthDate(normalized);
  const today = shanghaiDateParts(new Date());
  const birthDateValid =
    !!birthDate &&
    birthDate.year >= 1900 &&
    compareBirthDates(birthDate, today) <= 0;
  if (!birthDateValid) return result("invalid_birth_date", true);

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = "10X98765432";
  const sum = [...normalized.slice(0, 17)].reduce(
    (total, digit, index) => total + Number(digit) * weights[index],
    0,
  );
  const checksumValid = checks[sum % 11] === normalized[17];
  if (!checksumValid) return result("invalid_checksum", true, true);

  return {
    success: true,
    normalized,
    normalizedLength: normalized.length,
    basicPatternValid: true,
    birthDateValid: true,
    checksumValid: true,
    trimApplied,
    lowercaseXNormalized,
    regionValidationApplied: false,
  };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ] ?? 0;
}

function parseBirthDate(value: string): BirthDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
    ? { year, month, day }
    : null;
}

export function parseIdBirthDate(idNumber: string): BirthDate | null {
  if (!/^[0-9]{17}[0-9X]$/.test(idNumber)) return null;
  const year = Number(idNumber.slice(6, 10));
  const month = Number(idNumber.slice(10, 12));
  const day = Number(idNumber.slice(12, 14));
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
    ? { year, month, day }
    : null;
}

function compareBirthDates(left: BirthDate, right: BirthDate) {
  return (
    left.year - right.year || left.month - right.month || left.day - right.day
  );
}

function shanghaiDateParts(now: Date): BirthDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function getAdultEligibleAt(birthDate: BirthDate) {
  const year = birthDate.year + 18;
  // Product rule: Feb 29 birthdays reach adulthood on Feb 28 in non-leap years.
  const day = birthDate.month === 2 && birthDate.day === 29 && !isLeapYear(year) ? 28 : birthDate.day;
  return new Date(Date.UTC(year, birthDate.month - 1, day) - SHANGHAI_OFFSET_MS);
}

export function resolveAgeVerificationFromBirthDate(birthDate: BirthDate, now = new Date()): MockAgeVerification {
  const adultEligibleAt = getAdultEligibleAt(birthDate);
  return {
    adultEligibleAt,
    ageVerificationStatus: now >= adultEligibleAt ? "ADULT" as const : "MINOR" as const,
  };
}

export function resolveAgeVerification(idNumber: string, now = new Date()) {
  const birthDate = parseIdBirthDate(idNumber);
  if (!birthDate) throw new Error("invalid_id_number");
  return resolveAgeVerificationFromBirthDate(birthDate, now);
}

function getMockAgeVerification(value: unknown): MockAgeVerification | null {
  const profile = process.env.IDENTITY_VERIFY_MOCK_AGE_PROFILE;
  const configuredIdNumber = process.env.IDENTITY_VERIFY_MOCK_TEST_ID_NUMBER;
  if (
    process.env.NODE_ENV === "production" ||
    process.env.IDENTITY_VERIFY_PROVIDER !== "mock" ||
    process.env.IDENTITY_VERIFY_MOCK_MODE !== "success" ||
    (profile !== "adult" && profile !== "minor") ||
    configuredIdNumber !== MOCK_TEST_ID_NUMBER ||
    typeof value !== "string" ||
    value !== configuredIdNumber
  ) {
    return null;
  }
  const birthDate = parseBirthDate(process.env.IDENTITY_VERIFY_MOCK_BIRTH_DATE ?? "");
  if (!birthDate) return null;
  const age = resolveAgeVerificationFromBirthDate(birthDate);
  return age.ageVerificationStatus === profile.toUpperCase() ? age : null;
}

function logIdentityValidation(result: IdNumberValidationResult) {
  if (result.success) return;
  console.warn("[identity validation]", {
    failureStage: result.failureStage,
    normalizedLength: result.normalizedLength,
    basicPatternValid: result.basicPatternValid,
    birthDateValid: result.birthDateValid,
    checksumValid: result.checksumValid,
    regionValidationApplied: result.regionValidationApplied,
    trimApplied: result.trimApplied,
    lowercaseXNormalized: result.lowercaseXNormalized,
  });
}

export function validateIdentityInput(
  input: { realName: unknown; idNumber: unknown },
): IdentityInputValidationResult {
  const realName = String(input.realName ?? "").trim();
  if (realName.length < 2 || realName.length > 50 || /[ -]/.test(realName)) {
    return { success: false, error: "invalid_real_name" };
  }
  const mockAge = getMockAgeVerification(input.idNumber);
  if (mockAge) {
    return { success: true, realName, idNumber: String(input.idNumber), mockAge };
  }
  const idNumber = validateIdNumber(input.idNumber);
  if (!idNumber.success) {
    logIdentityValidation(idNumber);
    return { success: false, error: "invalid_id_number" };
  }
  return { success: true, realName, idNumber: idNumber.normalized };
}

export async function getIdentityRecord(userId: string) {
  const rows = await prisma.$queryRaw<IdentityRecord[]>(Prisma.sql`
    SELECT "realNameStatus", "realNameCiphertext", "idNumberLast4",
      "realNameVerifiedAt", "realNameVerifyProvider", "realNameLastAttemptAt",
      "ageVerificationStatus", "ageVerifiedAt", "adultEligibleAt", "identityVerificationSource"
    FROM "User" WHERE "id" = ${userId}
  `);
  return rows[0] ?? null;
}

export async function getUserChatAccess(userId: string): Promise<UserChatAccess> {
  const record = await getIdentityRecord(userId);
  if (!record || record.realNameStatus !== "VERIFIED") {
    return {
      identityVerificationStatus: record?.realNameStatus ?? "UNVERIFIED",
      ageVerificationStatus: record?.ageVerificationStatus ?? "UNKNOWN",
      canUseChat: false,
      reason: "real_name_required",
      record,
    };
  }

  if (
    record.ageVerificationStatus === "MINOR" &&
    record.adultEligibleAt &&
    record.adultEligibleAt <= new Date()
  ) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "User" SET "ageVerificationStatus" = 'ADULT'::"AgeVerificationStatus", "updatedAt" = NOW()
      WHERE "id" = ${userId} AND "realNameStatus" = 'VERIFIED'::"RealNameStatus"
        AND "ageVerificationStatus" = 'MINOR'::"AgeVerificationStatus"
        AND "adultEligibleAt" IS NOT NULL AND "adultEligibleAt" <= NOW()
    `);
    return { identityVerificationStatus: "VERIFIED", ageVerificationStatus: "ADULT", canUseChat: true, record: { ...record, ageVerificationStatus: "ADULT" } };
  }

  if (record.ageVerificationStatus === "ADULT") {
    return { identityVerificationStatus: "VERIFIED", ageVerificationStatus: "ADULT", canUseChat: true, record };
  }
  return {
    identityVerificationStatus: "VERIFIED",
    ageVerificationStatus: record.ageVerificationStatus,
    canUseChat: false,
    reason: record.ageVerificationStatus === "MINOR" ? "underage_restricted" : "age_verification_required",
    record,
  };
}

export async function getCurrentVerifiedUser(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return { user: null, response: unauthenticatedResponse() };
  const access = await getUserChatAccess(user.id);
  if (!access.canUseChat) return { user: null, response: access.reason === "underage_restricted" ? underageRestrictedResponse() : realNameRequiredResponse() };
  return { user, response: null };
}

export function unauthenticatedResponse() {
  return NextResponse.json({ error: true, message: "未登录" }, { status: 401 });
}

export function realNameRequiredResponse() {
  return NextResponse.json(
    { error: true, reason: "real_name_required", message: "请先完成实名认证" },
    { status: 403 },
  );
}

export function underageRestrictedResponse() {
  return NextResponse.json(
    { error: true, reason: "underage_restricted", message: "当前实名信息显示您未满18周岁，暂不能使用本服务。" },
    { status: 403 },
  );
}

export function toIdentityStatusResponse(record: IdentityRecord, access?: UserChatAccess) {
  let maskedRealName: string | null = null;
  try {
    const name = record.realNameCiphertext ? decryptIdentityValue(record.realNameCiphertext) : "";
    maskedRealName = name ? `${name.slice(0, 1)}${"*".repeat(Math.max(1, name.length - 1))}` : null;
  } catch {
    maskedRealName = null;
  }
  return {
    status: record.realNameStatus,
    verified: record.realNameStatus === "VERIFIED",
    maskedRealName,
    maskedIdNumber: record.idNumberLast4 ? `**************${record.idNumberLast4}` : null,
    verifiedAt: record.realNameVerifiedAt,
    provider: record.realNameVerifyProvider,
    ageVerificationStatus: access?.ageVerificationStatus ?? record.ageVerificationStatus,
    canUseChat: access?.canUseChat ?? false,
    ...(access?.reason ? { reason: access.reason, ageRestricted: access.reason === "underage_restricted" } : {}),
  };
}

export function identityRateLimitRetryAfterSeconds(oldestAttemptAt: Date, now = Date.now()) {
  return Math.max(0, Math.ceil((oldestAttemptAt.getTime() + 3 * 60_000 - now) / 1000));
}

export async function claimIdentityVerification(userId: string) {
  const rows = await prisma.$queryRaw<{ claimed: boolean; recentCount: bigint | number; oldestAttemptAt: Date | null }[]>(Prisma.sql`
    WITH "lockedUser" AS (SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE),
    "recentAttempts" AS (SELECT "createdAt" FROM "IdentityVerificationAttempt" WHERE "userId" = ${userId} AND "createdAt" > NOW() - INTERVAL '3 minutes'),
    "claimedUser" AS (
      UPDATE "User" SET "realNameStatus" = 'VERIFYING'::"RealNameStatus", "realNameLastAttemptAt" = NOW(), "realNameLastFailureReason" = NULL, "realNameVerifyProvider" = NULL, "realNameVerifyRequestId" = NULL, "updatedAt" = NOW()
      WHERE "id" IN (SELECT "id" FROM "lockedUser") AND "realNameStatus" <> 'VERIFIED'::"RealNameStatus"
      AND ("realNameStatus" <> 'VERIFYING'::"RealNameStatus" OR "realNameLastAttemptAt" <= NOW() - INTERVAL '5 minutes')
      AND (SELECT COUNT(*) FROM "recentAttempts") < 2 RETURNING "id"
    ), "insertedAttempt" AS (
      INSERT INTO "IdentityVerificationAttempt" ("id", "userId", "createdAt") SELECT ${randomUUID()}, "id", NOW() FROM "claimedUser" RETURNING "id"
    )
    SELECT EXISTS (SELECT 1 FROM "insertedAttempt") AS "claimed", (SELECT COUNT(*) FROM "recentAttempts") AS "recentCount", (SELECT MIN("createdAt") FROM "recentAttempts") AS "oldestAttemptAt"
  `);
  const row = rows[0];
  return { claimed: row?.claimed ?? false, retryAfterSeconds: row && Number(row.recentCount) >= 2 && row.oldestAttemptAt ? identityRateLimitRetryAfterSeconds(row.oldestAttemptAt) : undefined };
}

export async function failIdentityVerification(
  userId: string,
  reason: string,
  provider?: string,
  requestId?: string,
) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "User" SET "realNameStatus" = 'FAILED'::"RealNameStatus",
      "realNameLastFailureReason" = ${reason},
      "realNameVerifyProvider" = ${provider ?? null},
      "realNameVerifyRequestId" = ${requestId ?? null}, "updatedAt" = NOW()
    WHERE "id" = ${userId} AND "realNameStatus" = 'VERIFYING'::"RealNameStatus"
  `);
}

export async function completeIdentityVerification(input: {
  userId: string;
  realName: string;
  idNumber: string;
  provider: string;
  requestId?: string;
  mockAge?: MockAgeVerification;
}) {
  if (input.mockAge) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "User"
      SET "realNameStatus" = 'VERIFIED'::"RealNameStatus",
        "realNameCiphertext" = NULL, "idNumberCiphertext" = NULL,
        "idNumberHmac" = NULL, "idNumberLast4" = NULL,
        "realNameVerifiedAt" = NULL, "realNameVerifyProvider" = 'mock',
        "realNameVerifyRequestId" = NULL,
        "ageVerificationStatus" = ${input.mockAge.ageVerificationStatus}::"AgeVerificationStatus",
        "ageVerifiedAt" = NOW(), "adultEligibleAt" = ${input.mockAge.adultEligibleAt},
        "identityVerificationSource" = 'MOCK'::"IdentityVerificationSource",
        "realNameLastFailureReason" = NULL, "updatedAt" = NOW()
      WHERE "id" = ${input.userId} AND "realNameStatus" = 'VERIFYING'::"RealNameStatus"
    `);
    return;
  }
  const age = resolveAgeVerification(input.idNumber);
  const source: IdentityVerificationSource = input.provider === "aliyun_market" ? "ALIYUN_MARKET" : "MOCK";
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "User"
    SET "realNameStatus" = 'VERIFIED'::"RealNameStatus",
      "realNameCiphertext" = ${encryptIdentityValue(input.realName)},
      "idNumberCiphertext" = ${encryptIdentityValue(input.idNumber)},
      "idNumberHmac" = ${hmacIdNumber(input.idNumber)},
      "idNumberLast4" = ${input.idNumber.slice(-4)},
      "realNameVerifiedAt" = NOW(), "realNameVerifyProvider" = ${input.provider},
      "realNameVerifyRequestId" = ${input.requestId ?? null},
      "ageVerificationStatus" = ${age.ageVerificationStatus}::"AgeVerificationStatus",
      "ageVerifiedAt" = NOW(), "adultEligibleAt" = ${age.adultEligibleAt},
      "identityVerificationSource" = ${source}::"IdentityVerificationSource",
      "realNameLastFailureReason" = NULL, "updatedAt" = NOW()
    WHERE "id" = ${input.userId} AND "realNameStatus" = 'VERIFYING'::"RealNameStatus"
  `);
}
