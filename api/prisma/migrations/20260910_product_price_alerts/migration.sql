CREATE TABLE "ProductPriceAlert" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "variantId" TEXT,
  "watchedPrice" DECIMAL(12,2) NOT NULL,
  "lastObservedPrice" DECIMAL(12,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "ProductPriceAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductPriceAlert_productId_active_idx" ON "ProductPriceAlert"("productId", "active");
CREATE INDEX "ProductPriceAlert_variantId_active_idx" ON "ProductPriceAlert"("variantId", "active");
CREATE INDEX "ProductPriceAlert_userId_active_createdAt_idx" ON "ProductPriceAlert"("userId", "active", "createdAt");
CREATE INDEX "ProductPriceAlert_active_notifiedAt_idx" ON "ProductPriceAlert"("active", "notifiedAt");
CREATE UNIQUE INDEX "ProductPriceAlert_active_product_user_idx" ON "ProductPriceAlert"("productId", "userId") WHERE "active" = true AND "variantId" IS NULL;
CREATE UNIQUE INDEX "ProductPriceAlert_active_variant_user_idx" ON "ProductPriceAlert"("productId", "variantId", "userId") WHERE "active" = true AND "variantId" IS NOT NULL;

ALTER TABLE "ProductPriceAlert" ADD CONSTRAINT "ProductPriceAlert_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPriceAlert" ADD CONSTRAINT "ProductPriceAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPriceAlert" ADD CONSTRAINT "ProductPriceAlert_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
