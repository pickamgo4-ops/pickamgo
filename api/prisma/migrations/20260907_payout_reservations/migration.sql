ALTER TABLE "SellerEarnings" ADD COLUMN "payoutId" TEXT;
ALTER TABLE "RiderEarnings" ADD COLUMN "payoutId" TEXT;

CREATE INDEX "SellerEarnings_payoutId_idx" ON "SellerEarnings"("payoutId");
CREATE INDEX "RiderEarnings_payoutId_idx" ON "RiderEarnings"("payoutId");

ALTER TABLE "SellerEarnings" ADD CONSTRAINT "SellerEarnings_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiderEarnings" ADD CONSTRAINT "RiderEarnings_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;