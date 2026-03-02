/*
  Migration: project_based_tasks
  
  Summary:
  1. Create ProjectStatus enum
  2. Create projects table
  3. Add project_id (nullable) to tasks
  4. DATA MIGRATION: create one default project per (organization_id + department_id) combo
  5. DATA MIGRATION: map all tasks to the appropriate default project
  6. Make project_id NOT NULL
  7. Drop old department_id and organization_id from tasks
  8. Add FK and indexes
*/

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable (projects)
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "division_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE,
    "end_date" DATE,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (projects)
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");
CREATE INDEX "projects_division_id_idx" ON "projects"("division_id");
CREATE INDEX "projects_department_id_idx" ON "projects"("department_id");

-- AddForeignKey (projects)
ALTER TABLE "projects" ADD CONSTRAINT "projects_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATA MIGRATION STEP 1:
-- Create one default project for each unique (organization_id, department_id) combo
-- in tasks. The project name is derived from the department name (via join).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO "projects" ("id", "organization_id", "division_id", "department_id", "name", "status", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    t.organization_id,
    d.division_id,
    t.department_id,
    'General ' || d.name,
    'ACTIVE'::"ProjectStatus",
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT organization_id, department_id
    FROM "tasks"
) t
JOIN "departments" d ON d.id = t.department_id
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATA MIGRATION STEP 2:
-- Add project_id column (nullable first, then we populate it)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "tasks" ADD COLUMN "project_id" TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATA MIGRATION STEP 3:
-- Map each task to the corresponding default project
-- (matched by organization_id + department_id)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "tasks" t
SET "project_id" = p.id
FROM "projects" p
WHERE p.organization_id = t.organization_id
  AND p.department_id = t.department_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATA MIGRATION STEP 4:
-- Make project_id NOT NULL now that all rows are populated
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "tasks" ALTER COLUMN "project_id" SET NOT NULL;

-- DropForeignKey (old task relations)
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_department_id_fkey";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_organization_id_fkey";

-- DropIndex (old task indexes)
DROP INDEX IF EXISTS "tasks_department_id_idx";
DROP INDEX IF EXISTS "tasks_organization_id_idx";

-- AlterTable: drop old columns from tasks
ALTER TABLE "tasks"
    DROP COLUMN "department_id",
    DROP COLUMN "organization_id";

-- CreateIndex (tasks.project_id)
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- AddForeignKey (tasks → projects)
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
