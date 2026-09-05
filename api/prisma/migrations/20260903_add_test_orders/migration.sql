ALTER TABLE "Order" ADD COLUMN "isTestOrder" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Order_isTestOrder_idx" ON "Order"("isTestOrder");