-- 20260908_security_extensions
-- PickAmGo security hardening: session management, idempotency,
-- kill switches, granular account restrictions, and additional fraud
-- tracking. All additions are non-destructive.

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "device" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON "UserSession"("sessionToken");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE INDEX "UserSession_lastActiveAt_idx" ON "UserSession"("lastActiveAt");
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "userId" TEXT,
  "scope" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "response" TEXT,
  "statusCode" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");
CREATE INDEX "IdempotencyRecord_userId_idx" ON "IdempotencyRecord"("userId");
CREATE INDEX "IdempotencyRecord_scope_createdAt_idx" ON "IdempotencyRecord"("scope", "createdAt");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

CREATE TABLE "AccountChangeEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "actorId" TEXT,
  "verifiedVia" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountChangeEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountChangeEvent_userId_idx" ON "AccountChangeEvent"("userId");
CREATE INDEX "AccountChangeEvent_changeType_idx" ON "AccountChangeEvent"("changeType");
CREATE INDEX "AccountChangeEvent_createdAt_idx" ON "AccountChangeEvent"("createdAt");

CREATE TABLE "SystemKillSwitch" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "enabledBy" TEXT,
  "enabledAt" TIMESTAMP(3),
  "disabledBy" TEXT,
  "disabledAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemKillSwitch_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "FeatureFlag" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AccountRestriction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESTRICTED',
  "reason" TEXT,
  "createdBy" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountRestriction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountRestriction_userId_capability_key" ON "AccountRestriction"("userId", "capability");
CREATE INDEX "AccountRestriction_userId_idx" ON "AccountRestriction"("userId");
CREATE INDEX "AccountRestriction_capability_idx" ON "AccountRestriction"("capability");
CREATE INDEX "AccountRestriction_expiresAt_idx" ON "AccountRestriction"("expiresAt");
ALTER TABLE "AccountRestriction" ADD CONSTRAINT "AccountRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RiderRiskSignal" (
  "id" TEXT NOT NULL,
  "riderId" TEXT NOT NULL,
  "signal" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiderRiskSignal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RiderRiskSignal_riderId_idx" ON "RiderRiskSignal"("riderId");
CREATE INDEX "RiderRiskSignal_signal_idx" ON "RiderRiskSignal"("signal");
CREATE INDEX "RiderRiskSignal_createdAt_idx" ON "RiderRiskSignal"("createdAt");

CREATE TABLE "EvidenceRevision" (
  "id" TEXT NOT NULL,
  "evidenceId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "previousFileUrl" TEXT,
  "newFileUrl" TEXT,
  "previousNote" TEXT,
  "newNote" TEXT,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "replacedBy" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EvidenceRevision_evidenceId_idx" ON "EvidenceRevision"("evidenceId");
CREATE INDEX "EvidenceRevision_orderId_idx" ON "EvidenceRevision"("orderId");
CREATE INDEX "EvidenceRevision_createdAt_idx" ON "EvidenceRevision"("createdAt");

CREATE TABLE "RefundAbuseSignal" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefundAbuseSignal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RefundAbuseSignal_customerId_idx" ON "RefundAbuseSignal"("customerId");
CREATE INDEX "RefundAbuseSignal_status_idx" ON "RefundAbuseSignal"("status");
CREATE INDEX "RefundAbuseSignal_createdAt_idx" ON "RefundAbuseSignal"("createdAt");