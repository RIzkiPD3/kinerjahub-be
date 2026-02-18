-- AlterTable
ALTER TABLE "organizations"
ADD COLUMN "address" VARCHAR(255) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN "phone_number" VARCHAR(20) NOT NULL DEFAULT '',
ADD COLUMN "organization_id" INTEGER;

-- Backfill organization_id for existing rows to keep migration safe.
-- Existing data from this branch should be minimal; this uses the first organization.
WITH first_org AS (
  SELECT id FROM "organizations" ORDER BY id ASC LIMIT 1
)
UPDATE "users"
SET "organization_id" = (SELECT id FROM first_org)
WHERE "organization_id" IS NULL;

-- If there are still nulls (no organization existed), create one fallback record.
INSERT INTO "organizations" ("name", "address", "created_at", "update_at", "delete_at")
SELECT 'Default Organization', 'N/A', NOW(), NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM "organizations");

UPDATE "users"
SET "organization_id" = (
  SELECT id
  FROM "organizations"
  ORDER BY id ASC
  LIMIT 1
)
WHERE "organization_id" IS NULL;

-- AlterTable
ALTER TABLE "organizations"
ALTER COLUMN "address" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users"
ALTER COLUMN "name" DROP DEFAULT,
ALTER COLUMN "phone_number" DROP DEFAULT,
ALTER COLUMN "organization_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "users"
ADD CONSTRAINT "users_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
