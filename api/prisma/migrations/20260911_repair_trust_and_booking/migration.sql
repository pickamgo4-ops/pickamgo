CREATE TABLE IF NOT EXISTS "SellerRisk" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL DEFAULT 'NORMAL',
  "trustScore" INTEGER NOT NULL DEFAULT 50,
  "flags" TEXT,
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerRisk_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SellerRisk_userId_key" ON "SellerRisk"("userId");
CREATE INDEX IF NOT EXISTS "SellerRisk_riskLevel_idx" ON "SellerRisk"("riskLevel");
CREATE INDEX IF NOT EXISTS "SellerRisk_trustScore_idx" ON "SellerRisk"("trustScore");

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "minNoticeHours" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "bufferMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "allowStaffSelection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "requireApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "staffRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "staffName" TEXT;

CREATE TABLE IF NOT EXISTS "Staff" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "shopId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "description" TEXT,
  "avatar" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "StaffService" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "staffId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffService_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "StaffAvailability" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "staffId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "breakStart" TEXT,
  "breakEnd" TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "isDayOff" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "BookingRule" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "shopId" TEXT NOT NULL,
  "autoConfirm" BOOLEAN NOT NULL DEFAULT false,
  "requireDeposit" BOOLEAN NOT NULL DEFAULT false,
  "depositAmount" DECIMAL(12,2),
  "minBookingNoticeHours" INTEGER NOT NULL DEFAULT 2,
  "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
  "cancellationHours" INTEGER NOT NULL DEFAULT 24,
  "bufferTimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "allowStaffSelection" BOOLEAN NOT NULL DEFAULT true,
  "allowTimeSelection" BOOLEAN NOT NULL DEFAULT true,
  "maxBookingsPerDay" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BookingRule_shopId_key" ON "BookingRule"("shopId");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffService_staffId_serviceId_key" ON "StaffService"("staffId", "serviceId");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffAvailability_staffId_dayOfWeek_key" ON "StaffAvailability"("staffId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "Staff_shopId_idx" ON "Staff"("shopId");
CREATE INDEX IF NOT EXISTS "StaffService_staffId_idx" ON "StaffService"("staffId");
CREATE INDEX IF NOT EXISTS "StaffService_serviceId_idx" ON "StaffService"("serviceId");
CREATE INDEX IF NOT EXISTS "StaffAvailability_staffId_idx" ON "StaffAvailability"("staffId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SellerRisk_userId_fkey') THEN
    ALTER TABLE "SellerRisk" ADD CONSTRAINT "SellerRisk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Staff_shopId_fkey') THEN
    ALTER TABLE "Staff" ADD CONSTRAINT "Staff_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffService_staffId_fkey') THEN
    ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffService_serviceId_fkey') THEN
    ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffAvailability_staffId_fkey') THEN
    ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingRule_shopId_fkey') THEN
    ALTER TABLE "BookingRule" ADD CONSTRAINT "BookingRule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_staffId_fkey') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
