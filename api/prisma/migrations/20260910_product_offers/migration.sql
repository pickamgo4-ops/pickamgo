ALTER TABLE "Product" ADD COLUMN "allowOffers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "minimumOfferAmount" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN "allowCounteroffers" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CartItem" ADD COLUMN "offerId" TEXT;

CREATE TABLE "ProductOffer" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "parentOfferId" TEXT,
  "productId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "referencePrice" DECIMAL(12,2) NOT NULL,
  "offerAmount" DECIMAL(12,2) NOT NULL,
  "counterOfferAmount" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "proposalBy" TEXT NOT NULL DEFAULT 'BUYER',
  "buyerMessage" TEXT,
  "sellerMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductOffer_productId_createdAt_idx" ON "ProductOffer"("productId", "createdAt");
CREATE INDEX "ProductOffer_buyerId_status_createdAt_idx" ON "ProductOffer"("buyerId", "status", "createdAt");
CREATE INDEX "ProductOffer_sellerId_status_createdAt_idx" ON "ProductOffer"("sellerId", "status", "createdAt");
CREATE INDEX "ProductOffer_threadId_createdAt_idx" ON "ProductOffer"("threadId", "createdAt");
CREATE INDEX "ProductOffer_status_expiresAt_idx" ON "ProductOffer"("status", "expiresAt");

ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOffer" ADD CONSTRAINT "ProductOffer_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "ProductOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
