ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_orderId_key";
DROP INDEX IF EXISTS "Refund_orderId_key";
CREATE INDEX IF NOT EXISTS "Refund_orderId_status_createdAt_idx" ON "Refund"("orderId", "status", "createdAt");
ALTER TABLE "CollaborationRefundAllocation" ADD COLUMN IF NOT EXISTS "sellerPayoutReversal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "CollaborationRefundAllocation" ADD COLUMN IF NOT EXISTS "platformFeeReversal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "CollaborationAllocation" ADD COLUMN IF NOT EXISTS "remainingNetAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
UPDATE "CollaborationAllocation" SET "remainingNetAmount" = "netAmount" WHERE "remainingNetAmount" = 0;
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "collaborationShipmentId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Delivery_collaborationShipmentId_key" ON "Delivery"("collaborationShipmentId");
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Delivery_collaborationShipmentId_fkey') THEN
		ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_collaborationShipmentId_fkey" FOREIGN KEY ("collaborationShipmentId") REFERENCES "CollaborationShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CollaborationRiderEarnings" (
	"id" TEXT NOT NULL,
	"riderId" TEXT,
	"deliveryId" TEXT NOT NULL,
	"shipmentId" TEXT NOT NULL,
	"grossAmount" DECIMAL(12,2) NOT NULL,
	"platformFee" DECIMAL(12,2) NOT NULL,
	"netAmount" DECIMAL(12,2) NOT NULL,
	"status" TEXT NOT NULL DEFAULT 'PENDING',
	"availableAt" TIMESTAMP(3),
	"deliveredAt" TIMESTAMP(3),
	"withdrawnAt" TIMESTAMP(3),
	"payoutId" TEXT,
	CONSTRAINT "CollaborationRiderEarnings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationRiderEarnings_deliveryId_key" ON "CollaborationRiderEarnings"("deliveryId");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationRiderEarnings_shipmentId_key" ON "CollaborationRiderEarnings"("shipmentId");
CREATE INDEX IF NOT EXISTS "CollaborationRiderEarnings_riderId_status_availableAt_idx" ON "CollaborationRiderEarnings"("riderId", "status", "availableAt");
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollaborationRiderEarnings_deliveryId_fkey') THEN
		ALTER TABLE "CollaborationRiderEarnings" ADD CONSTRAINT "CollaborationRiderEarnings_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollaborationRiderEarnings_shipmentId_fkey') THEN
		ALTER TABLE "CollaborationRiderEarnings" ADD CONSTRAINT "CollaborationRiderEarnings_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "CollaborationShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollaborationRiderEarnings_riderId_fkey') THEN
		ALTER TABLE "CollaborationRiderEarnings" ADD CONSTRAINT "CollaborationRiderEarnings_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;
