ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "sellerType" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "businessDescription" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "intendedSell" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "agreedToTerms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "agreedAt" TIMESTAMP(3);
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'SELLER';
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT DEFAULT 'UNDER_REVIEW';
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "verificationProvider" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "verificationReference" TEXT;
ALTER TABLE "SellerVerification" ADD COLUMN IF NOT EXISTS "verificationDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "SellerVerification_status_idx" ON "SellerVerification"("status");
CREATE INDEX IF NOT EXISTS "SellerVerification_reviewStatus_idx" ON "SellerVerification"("reviewStatus");
CREATE INDEX IF NOT EXISTS "SellerVerification_verificationMethod_idx" ON "SellerVerification"("verificationMethod");
