/*
  Warnings:

  - You are about to drop the column `image` on the `church_posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "church_posts" DROP COLUMN "image",
ADD COLUMN     "images" TEXT[];
