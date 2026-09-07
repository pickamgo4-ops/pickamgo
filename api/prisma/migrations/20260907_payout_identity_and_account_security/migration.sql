ALTER TABLE "User" ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "restrictionReason" TEXT;
ALTER TABLE "User" ADD COLUMN "statusChangedAt" TIMESTAMP(3);

ALTER TABLE "PayoutMethod" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'REQUIRES_REVIEW';
ALTER TABLE "PayoutMethod" ADD COLUMN "beneficiaryName" TEXT;
ALTER TABLE "PayoutMethod" ADD COLUMN "beneficiaryNameVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PayoutMethod" ADD COLUMN "beneficiaryPhoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PayoutMethod" ADD COLUMN "disclaimerVersion" TEXT;
ALTER TABLE "PayoutMethod" ADD COLUMN "disclaimerAcceptedAt" TIMESTAMP(3);
ALTER TABLE "PayoutMethod" ADD COLUMN "lastChangedIp" TEXT;
ALTER TABLE "PayoutMethod" ADD COLUMN "lastChangedUserAgent" TEXT;

ALTER TABLE "PayoutMethodChange" ADD COLUMN "previousPhoneLast4" TEXT;
ALTER TABLE "PayoutMethodChange" ADD COLUMN "newPhoneLast4" TEXT;
ALTER TABLE "PayoutMethodChange" ADD COLUMN "previousNameHash" TEXT;
ALTER TABLE "PayoutMethodChange" ADD COLUMN "newNameHash" TEXT;
ALTER TABLE "PayoutMethodChange" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "PayoutMethodChange" ADD COLUMN "userAgent" TEXT;

CREATE TABLE "PayoutDisclaimerAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "payoutMethodId" TEXT,
  "version" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayoutDisclaimerAcceptance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutDisclaimerAcceptance_userId_acceptedAt_idx" ON "PayoutDisclaimerAcceptance"("userId", "acceptedAt");
CREATE INDEX "PayoutDisclaimerAcceptance_payoutMethodId_idx" ON "PayoutDisclaimerAcceptance"("payoutMethodId");
ALTER TABLE "PayoutDisclaimerAcceptance" ADD CONSTRAINT "PayoutDisclaimerAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutDisclaimerAcceptance" ADD CONSTRAINT "PayoutDisclaimerAcceptance_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "PayoutMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AccountAppeal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "decision" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountAppeal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountAppeal_userId_status_idx" ON "AccountAppeal"("userId", "status");
CREATE INDEX "AccountAppeal_status_createdAt_idx" ON "AccountAppeal"("status", "createdAt");
ALTER TABLE "AccountAppeal" ADD CONSTRAINT "AccountAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountAppeal" ADD CONSTRAINT "AccountAppeal_reviewer_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;