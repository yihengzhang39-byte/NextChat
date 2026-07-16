CREATE TABLE "IdentityVerificationAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "IdentityVerificationAttempt_userId_createdAt_idx" ON "IdentityVerificationAttempt"("userId", "createdAt");
