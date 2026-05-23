/*
  Warnings:

  - The `target_church_ids` column on the `announcements` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "target_church_ids",
ADD COLUMN     "target_church_ids" TEXT[];
