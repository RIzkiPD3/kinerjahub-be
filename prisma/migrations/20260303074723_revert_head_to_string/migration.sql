/*
  Warnings:

  - You are about to drop the column `head_id` on the `departments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_head_id_fkey";

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "head_id",
ADD COLUMN     "head" TEXT;
