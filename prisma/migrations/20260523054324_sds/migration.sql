/*
  Warnings:

  - The `image` column on the `community_comment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `image` column on the `community_post` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "community_comment" DROP COLUMN "image",
ADD COLUMN     "image" TEXT[];

-- AlterTable
ALTER TABLE "community_post" DROP COLUMN "image",
ADD COLUMN     "image" TEXT[];
