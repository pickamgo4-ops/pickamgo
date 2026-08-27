-- Create settings table for platform configuration
CREATE TABLE IF NOT EXISTS "Setting" (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT,
  description TEXT,
  type TEXT DEFAULT 'string',
  updatedBy TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "Setting_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"(key);
CREATE INDEX IF NOT EXISTS "Setting_category_key" ON "Setting"(category);
CREATE INDEX IF NOT EXISTS "Setting_key_key_idx" ON "Setting"(key);
