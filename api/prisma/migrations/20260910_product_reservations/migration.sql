ALTER TABLE "Product" ADD COLUMN "allowReservations" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CartItem" ADD COLUMN "reservationId" TEXT;

CREATE TABLE "ProductReservation" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "userId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "orderId" TEXT,
  CONSTRAINT "ProductReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductReservation_productId_status_expiresAt_idx" ON "ProductReservation"("productId", "status", "expiresAt");
CREATE INDEX "ProductReservation_variantId_status_expiresAt_idx" ON "ProductReservation"("variantId", "status", "expiresAt");
CREATE INDEX "ProductReservation_userId_status_expiresAt_idx" ON "ProductReservation"("userId", "status", "expiresAt");
CREATE INDEX "ProductReservation_status_expiresAt_idx" ON "ProductReservation"("status", "expiresAt");
CREATE INDEX "ProductReservation_orderId_idx" ON "ProductReservation"("orderId");

ALTER TABLE "ProductReservation" ADD CONSTRAINT "ProductReservation_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReservation" ADD CONSTRAINT "ProductReservation_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReservation" ADD CONSTRAINT "ProductReservation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "ProductReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
