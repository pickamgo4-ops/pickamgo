-- Add delivery coordinates to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLatitude" REAL;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLongitude" REAL;

-- Add delivery coordinates to Delivery table
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "pickupLatitude" REAL;
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "pickupLongitude" REAL;
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "dropoffLatitude" REAL;
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "dropoffLongitude" REAL;
