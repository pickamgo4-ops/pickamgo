CREATE TABLE "PhoneOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PhoneOtp" ADD CONSTRAINT "PhoneOtp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PhoneOtp_userId_purpose_createdAt_idx" ON "PhoneOtp"("userId", "purpose", "createdAt");
CREATE INDEX "PhoneOtp_phoneNumber_purpose_createdAt_idx" ON "PhoneOtp"("phoneNumber", "purpose", "createdAt");
CREATE INDEX "PhoneOtp_expiresAt_idx" ON "PhoneOtp"("expiresAt");