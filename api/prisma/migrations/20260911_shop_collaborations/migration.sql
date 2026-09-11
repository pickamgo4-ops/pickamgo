ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "collaborationId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "collaborationProductId" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "collaborationId" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "collaborationId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "collaborationProductId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "allocatedPrice" DECIMAL(12,2);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "platformCommission" DECIMAL(12,2);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "sellerPayout" DECIMAL(12,2);

CREATE TABLE IF NOT EXISTS "Collaboration" (
  "id" TEXT NOT NULL,
  "ownerShopId" TEXT NOT NULL,
  "ownerSellerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "coverImage" TEXT,
  "type" TEXT NOT NULL DEFAULT 'BUNDLE',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "bundlePrice" DECIMAL(12,2),
  "rules" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Collaboration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollaborationParticipant" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
  "role" TEXT NOT NULL DEFAULT 'PARTICIPANT',
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollaborationInvitation" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "inviterShopId" TEXT NOT NULL,
  "inviterSellerId" TEXT NOT NULL,
  "inviteeShopId" TEXT NOT NULL,
  "inviteeSellerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollaborationProduct" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "shopId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollaborationAllocation" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "collaborationProductId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL,
  "platformFee" DECIMAL(12,2) NOT NULL,
  "netAmount" DECIMAL(12,2) NOT NULL,
  "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payoutId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollaborationShipment" (
  "id" TEXT NOT NULL,
  "collaborationId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryLatitude" DOUBLE PRECISION,
  "deliveryLongitude" DOUBLE PRECISION,
  "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "fulfillmentMethod" TEXT NOT NULL DEFAULT 'FIND_IT_NEAR_ME_RIDER',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationShipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollaborationRefundAllocation" (
  "id" TEXT NOT NULL,
  "refundId" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationRefundAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationParticipant_collaborationId_shopId_key" ON "CollaborationParticipant"("collaborationId", "shopId");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationInvitation_collaborationId_inviteeShopId_key" ON "CollaborationInvitation"("collaborationId", "inviteeShopId");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationProduct_collaborationId_productId_variantId_key" ON "CollaborationProduct"("collaborationId", "productId", "variantId");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationAllocation_orderItemId_key" ON "CollaborationAllocation"("orderItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationShipment_orderId_shopId_key" ON "CollaborationShipment"("orderId", "shopId");
CREATE UNIQUE INDEX IF NOT EXISTS "CollaborationRefundAllocation_refundId_allocationId_key" ON "CollaborationRefundAllocation"("refundId", "allocationId");
CREATE INDEX IF NOT EXISTS "Collaboration_status_startsAt_endsAt_idx" ON "Collaboration"("status", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "Collaboration_ownerShopId_status_idx" ON "Collaboration"("ownerShopId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationParticipant_sellerId_status_idx" ON "CollaborationParticipant"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationParticipant_shopId_status_idx" ON "CollaborationParticipant"("shopId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationInvitation_inviteeSellerId_status_idx" ON "CollaborationInvitation"("inviteeSellerId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationInvitation_inviterSellerId_status_idx" ON "CollaborationInvitation"("inviterSellerId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationProduct_productId_variantId_idx" ON "CollaborationProduct"("productId", "variantId");
CREATE INDEX IF NOT EXISTS "CollaborationProduct_shopId_collaborationId_idx" ON "CollaborationProduct"("shopId", "collaborationId");
CREATE INDEX IF NOT EXISTS "CollaborationAllocation_sellerId_status_createdAt_idx" ON "CollaborationAllocation"("sellerId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "CollaborationAllocation_shopId_status_idx" ON "CollaborationAllocation"("shopId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationAllocation_collaborationId_orderId_idx" ON "CollaborationAllocation"("collaborationId", "orderId");
CREATE INDEX IF NOT EXISTS "CollaborationShipment_shopId_status_idx" ON "CollaborationShipment"("shopId", "status");
CREATE INDEX IF NOT EXISTS "CollaborationShipment_orderId_idx" ON "CollaborationShipment"("orderId");
CREATE INDEX IF NOT EXISTS "CollaborationRefundAllocation_allocationId_idx" ON "CollaborationRefundAllocation"("allocationId");
CREATE INDEX IF NOT EXISTS "CartItem_collaborationId_idx" ON "CartItem"("collaborationId");
CREATE INDEX IF NOT EXISTS "Order_collaborationId_idx" ON "Order"("collaborationId");
CREATE INDEX IF NOT EXISTS "OrderItem_shopId_sellerId_idx" ON "OrderItem"("shopId", "sellerId");
CREATE INDEX IF NOT EXISTS "OrderItem_collaborationId_idx" ON "OrderItem"("collaborationId");

ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_ownerShopId_fkey" FOREIGN KEY ("ownerShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_ownerSellerId_fkey" FOREIGN KEY ("ownerSellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationParticipant" ADD CONSTRAINT "CollaborationParticipant_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationParticipant" ADD CONSTRAINT "CollaborationParticipant_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationParticipant" ADD CONSTRAINT "CollaborationParticipant_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationInvitation" ADD CONSTRAINT "CollaborationInvitation_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationInvitation" ADD CONSTRAINT "CollaborationInvitation_inviterShopId_fkey" FOREIGN KEY ("inviterShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationInvitation" ADD CONSTRAINT "CollaborationInvitation_inviterSellerId_fkey" FOREIGN KEY ("inviterSellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationInvitation" ADD CONSTRAINT "CollaborationInvitation_inviteeShopId_fkey" FOREIGN KEY ("inviteeShopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationInvitation" ADD CONSTRAINT "CollaborationInvitation_inviteeSellerId_fkey" FOREIGN KEY ("inviteeSellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationProduct" ADD CONSTRAINT "CollaborationProduct_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationProduct" ADD CONSTRAINT "CollaborationProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationProduct" ADD CONSTRAINT "CollaborationProduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborationProduct" ADD CONSTRAINT "CollaborationProduct_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationProduct" ADD CONSTRAINT "CollaborationProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAllocation" ADD CONSTRAINT "CollaborationAllocation_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAllocation" ADD CONSTRAINT "CollaborationAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAllocation" ADD CONSTRAINT "CollaborationAllocation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAllocation" ADD CONSTRAINT "CollaborationAllocation_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAllocation" ADD CONSTRAINT "CollaborationAllocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationAllocation" ADD CONSTRAINT "CollaborationAllocation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationShipment" ADD CONSTRAINT "CollaborationShipment_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationShipment" ADD CONSTRAINT "CollaborationShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationShipment" ADD CONSTRAINT "CollaborationShipment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationShipment" ADD CONSTRAINT "CollaborationShipment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationRefundAllocation" ADD CONSTRAINT "CollaborationRefundAllocation_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborationRefundAllocation" ADD CONSTRAINT "CollaborationRefundAllocation_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "CollaborationAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_collaborationProductId_fkey" FOREIGN KEY ("collaborationProductId") REFERENCES "CollaborationProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
