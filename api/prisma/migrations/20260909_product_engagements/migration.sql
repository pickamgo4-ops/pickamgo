CREATE TABLE IF NOT EXISTS "ProductEngagement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductEngagement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductEngagement_productId_type_createdAt_idx"
  ON "ProductEngagement"("productId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductEngagement_productId_userId_type_idx"
  ON "ProductEngagement"("productId", "userId", "type");
ALTER TABLE "ProductEngagement"
  ADD CONSTRAINT "ProductEngagement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE;