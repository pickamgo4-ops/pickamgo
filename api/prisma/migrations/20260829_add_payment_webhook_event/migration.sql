CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_reference_key"
ON "PaymentWebhookEvent"("reference");

CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_reference_idx"
ON "PaymentWebhookEvent"("reference");

CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_status_idx"
ON "PaymentWebhookEvent"("status");

CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_createdAt_idx"
ON "PaymentWebhookEvent"("createdAt");
