-- CreateTable
CREATE TABLE "PublicNotice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFORMATION',
    "icon" TEXT,
    "imageUrl" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "linkTarget" TEXT NOT NULL DEFAULT '_self',
    "pageTargets" TEXT NOT NULL DEFAULT 'ALL',
    "audience" TEXT NOT NULL DEFAULT 'EVERYONE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isDismissible" BOOLEAN NOT NULL DEFAULT true,
    "rememberDismissal" BOOLEAN NOT NULL DEFAULT true,
    "reappearAfterHours" INTEGER DEFAULT 24,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PublicNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicNoticeDismissal" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicNoticeDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicNotice_status_idx" ON "PublicNotice"("status");

-- CreateIndex
CREATE INDEX "PublicNotice_type_idx" ON "PublicNotice"("type");

-- CreateIndex
CREATE INDEX "PublicNotice_startsAt_endsAt_idx" ON "PublicNotice"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PublicNotice_priority_idx" ON "PublicNotice"("priority");

-- CreateIndex
CREATE INDEX "PublicNotice_createdBy_idx" ON "PublicNotice"("createdBy");

-- CreateIndex
CREATE INDEX "PublicNotice_createdAt_idx" ON "PublicNotice"("createdAt");

-- CreateIndex
CREATE INDEX "PublicNoticeDismissal_noticeId_idx" ON "PublicNoticeDismissal"("noticeId");

-- CreateIndex
CREATE INDEX "PublicNoticeDismissal_userId_idx" ON "PublicNoticeDismissal"("userId");

-- CreateIndex
CREATE INDEX "PublicNoticeDismissal_sessionId_idx" ON "PublicNoticeDismissal"("sessionId");

-- CreateIndex
CREATE INDEX "PublicNoticeDismissal_dismissedAt_idx" ON "PublicNoticeDismissal"("dismissedAt");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "PublicNoticeDismissal_noticeId_userId_key" ON "PublicNoticeDismissal"("noticeId", "userId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "PublicNoticeDismissal_noticeId_sessionId_key" ON "PublicNoticeDismissal"("noticeId", "sessionId");

-- AddForeignKey
ALTER TABLE "PublicNotice" ADD CONSTRAINT "PublicNotice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicNoticeDismissal" ADD CONSTRAINT "PublicNoticeDismissal_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "PublicNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
