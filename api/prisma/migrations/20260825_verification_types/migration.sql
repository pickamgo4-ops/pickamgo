ALTER TABLE "SellerVerification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'SELLER';
CREATE INDEX "SellerVerification_type_status_idx" ON "SellerVerification"("type", "status");