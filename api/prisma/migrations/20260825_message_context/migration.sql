ALTER TABLE "Conversation" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "orderId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "closedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "Conversation_participant1Id_participant2Id_key";
CREATE UNIQUE INDEX "Conversation_orderId_key" ON "Conversation"("orderId");
CREATE INDEX "Conversation_shopId_idx" ON "Conversation"("shopId");
CREATE INDEX "Conversation_orderId_idx" ON "Conversation"("orderId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;