CREATE TABLE "ShippingZone" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "region" TEXT,
  "city" TEXT,
  "area" TEXT,
  "locations" TEXT,
  "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "freeDeliveryFrom" DECIMAL(12,2),
  "estimatedDelivery" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShippingZone_shopId_isActive_idx" ON "ShippingZone"("shopId", "isActive");
CREATE INDEX "ShippingZone_city_area_idx" ON "ShippingZone"("city", "area");
ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProductCollection" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductCollection_shopId_slug_key" ON "ProductCollection"("shopId", "slug");
CREATE INDEX "ProductCollection_shopId_isVisible_sortOrder_idx" ON "ProductCollection"("shopId", "isVisible", "sortOrder");
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CollectionProduct" (
  "collectionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("collectionId", "productId")
);
CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");
ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProductPromotion" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CLEARANCE',
  "discountType" TEXT NOT NULL,
  "discountValue" DECIMAL(12,2) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "maxQuantity" INTEGER,
  "bannerUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPromotion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductPromotion_shopId_status_startsAt_endsAt_idx" ON "ProductPromotion"("shopId", "status", "startsAt", "endsAt");
ALTER TABLE "ProductPromotion" ADD CONSTRAINT "ProductPromotion_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PromotionProduct" (
  "promotionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "originalPrice" DECIMAL(12,2) NOT NULL,
  "finalPrice" DECIMAL(12,2) NOT NULL,
  "unitsSold" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("promotionId", "productId")
);
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "ProductPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SellerQrCode" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "scanCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerQrCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SellerQrCode_shopId_key" ON "SellerQrCode"("shopId");
CREATE UNIQUE INDEX "SellerQrCode_publicToken_key" ON "SellerQrCode"("publicToken");
ALTER TABLE "SellerQrCode" ADD CONSTRAINT "SellerQrCode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SellerQrScan" (
  "id" TEXT NOT NULL,
  "qrCodeId" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referrer" TEXT,
  CONSTRAINT "SellerQrScan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SellerQrScan_qrCodeId_scannedAt_idx" ON "SellerQrScan"("qrCodeId", "scannedAt");
ALTER TABLE "SellerQrScan" ADD CONSTRAINT "SellerQrScan_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "SellerQrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
