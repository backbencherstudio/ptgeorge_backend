/*
  Warnings:

  - You are about to drop the column `cities` on the `ads` table. All the data in the column will be lost.
  - You are about to drop the column `countries` on the `ads` table. All the data in the column will be lost.
  - You are about to drop the column `states` on the `ads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ads" DROP COLUMN "cities",
DROP COLUMN "countries",
DROP COLUMN "states",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;
