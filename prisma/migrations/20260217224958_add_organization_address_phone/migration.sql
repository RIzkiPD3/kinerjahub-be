/*
  Warnings:

  - Added the required column `address` to the `organizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;
