CREATE TYPE "AgeVerificationStatus" AS ENUM ('UNKNOWN', 'ADULT', 'MINOR');
CREATE TYPE "IdentityVerificationSource" AS ENUM ('ALIYUN_MARKET', 'FILING_TEST', 'MOCK');

ALTER TABLE "User"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "ageVerificationStatus" "AgeVerificationStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "ageVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "adultEligibleAt" TIMESTAMP(3),
  ADD COLUMN "identityVerificationSource" "IdentityVerificationSource";

UPDATE "User"
SET "ageVerificationStatus" = 'ADULT'
WHERE "realNameStatus" = 'VERIFIED';

INSERT INTO "User" (
  "id", "phone", "displayName", "acceptedTerms", "realNameStatus",
  "ageVerificationStatus", "identityVerificationSource", "updatedAt"
)
VALUES
  ('filing-test-user-01', '13522223333', '备案测试1', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-02', '15611113333', '备案测试2', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-03', '18099990000', '备案测试3', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-04', '15022223333', '备案测试4', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-05', '17877778888', '备案测试5', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-06', '19233331111', '备案测试6', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-07', '19544446666', '备案测试7', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-08', '17366665555', '备案测试8', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-09', '18344447777', '备案测试9', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP),
  ('filing-test-user-10', '15877778888', '备案测试10', true, 'VERIFIED', 'ADULT', 'FILING_TEST', CURRENT_TIMESTAMP)
ON CONFLICT ("phone") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "realNameStatus" = 'VERIFIED',
  "realNameCiphertext" = NULL,
  "idNumberCiphertext" = NULL,
  "idNumberHmac" = NULL,
  "idNumberLast4" = NULL,
  "realNameVerifiedAt" = NULL,
  "realNameVerifyProvider" = NULL,
  "realNameVerifyRequestId" = NULL,
  "realNameLastFailureReason" = NULL,
  "realNameLastAttemptAt" = NULL,
  "ageVerificationStatus" = 'ADULT',
  "ageVerifiedAt" = NULL,
  "adultEligibleAt" = NULL,
  "identityVerificationSource" = 'FILING_TEST',
  "updatedAt" = CURRENT_TIMESTAMP;
