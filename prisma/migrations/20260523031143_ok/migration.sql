/*
  Warnings:

  - You are about to drop the column `church_id` on the `ads` table. All the data in the column will be lost.
  - You are about to drop the column `target_type` on the `ads` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ads" DROP CONSTRAINT "ads_church_id_fkey";

-- AlterTable
ALTER TABLE "ads" DROP COLUMN "church_id",
DROP COLUMN "target_type";

-- DropEnum
DROP TYPE "AdTargetType";
