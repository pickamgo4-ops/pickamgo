CREATE INDEX IF NOT EXISTS "ProductView_productId_createdAt_idx"
  ON "ProductView"("productId", "createdAt");

CREATE INDEX IF NOT EXISTS "ProductView_productId_userId_createdAt_idx"
  ON "ProductView"("productId", "userId", "createdAt");

CREATE INDEX IF NOT EXISTS "ProductView_productId_sessionId_createdAt_idx"
  ON "ProductView"("productId", "sessionId", "createdAt");