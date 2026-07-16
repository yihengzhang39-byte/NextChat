CREATE TYPE "RealNameStatus" AS ENUM ('UNVERIFIED', 'VERIFYING', 'VERIFIED', 'FAILED');

ALTER TABLE "User"
  ADD COLUMN "realNameStatus" "RealNameStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "realNameCiphertext" TEXT,
  ADD COLUMN "idNumberCiphertext" TEXT,
  ADD COLUMN "idNumberHmac" TEXT,
  ADD COLUMN "idNumberLast4" TEXT,
  ADD COLUMN "realNameVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "realNameVerifyProvider" TEXT,
  ADD COLUMN "realNameVerifyRequestId" TEXT,
  ADD COLUMN "realNameLastFailureReason" TEXT,
  ADD COLUMN "realNameLastAttemptAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_idNumberHmac_key" ON "User"("idNumberHmac");
