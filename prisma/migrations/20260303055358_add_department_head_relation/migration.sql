/*
  Warnings:

  - You are about to drop the column `head` on the `departments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "departments" DROP COLUMN "head",
ADD COLUMN     "head_id" TEXT;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
