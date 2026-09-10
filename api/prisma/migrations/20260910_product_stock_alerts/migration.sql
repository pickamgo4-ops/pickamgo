CREATE TABLE "ProductStockAlert" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "variantId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "ProductStockAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductStockAlert_productId_active_idx" ON "ProductStockAlert"("productId", "active");
CREATE INDEX "ProductStockAlert_variantId_active_idx" ON "ProductStockAlert"("variantId", "active");
CREATE INDEX "ProductStockAlert_userId_active_createdAt_idx" ON "ProductStockAlert"("userId", "active", "createdAt");
CREATE INDEX "ProductStockAlert_active_notifiedAt_idx" ON "ProductStockAlert"("active", "notifiedAt");
CREATE UNIQUE INDEX "ProductStockAlert_active_product_user_idx" ON "ProductStockAlert"("productId", "userId") WHERE "active" = true AND "variantId" IS NULL;
CREATE UNIQUE INDEX "ProductStockAlert_active_variant_user_idx" ON "ProductStockAlert"("productId", "variantId", "userId") WHERE "active" = true AND "variantId" IS NOT NULL;

ALTER TABLE "ProductStockAlert" ADD CONSTRAINT "ProductStockAlert_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductStockAlert" ADD CONSTRAINT "ProductStockAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductStockAlert" ADD CONSTRAINT "ProductStockAlert_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
