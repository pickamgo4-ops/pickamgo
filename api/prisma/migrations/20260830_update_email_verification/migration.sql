-- AlterTable
ALTER TABLE "EmailVerification" ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes');
