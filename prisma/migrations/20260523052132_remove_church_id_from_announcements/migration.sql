/*
  Warnings:

  - You are about to drop the column `church_id` on the `announcements` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "announcements" DROP CONSTRAINT "announcements_church_id_fkey";

-- DropIndex
DROP INDEX "announcements_church_id_idx";

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "church_id";
