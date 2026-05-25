/*
  Warnings:

  - The values [COMMUNITY_FEED] on the enum `AdPlacement` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `church_community` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `community_comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `community_comment_replies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `community_post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `community_post_react` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdPlacement_new" AS ENUM ('HOME_BANNER', 'SIDEBAR', 'IN_ARTICLE', 'POPUP', 'FULLSCREEN', 'CHURCH_FEED');
ALTER TABLE "public"."ads" ALTER COLUMN "placement" DROP DEFAULT;
ALTER TABLE "ads" ALTER COLUMN "placement" TYPE "AdPlacement_new" USING ("placement"::text::"AdPlacement_new");
ALTER TYPE "AdPlacement" RENAME TO "AdPlacement_old";
ALTER TYPE "AdPlacement_new" RENAME TO "AdPlacement";
DROP TYPE "public"."AdPlacement_old";
ALTER TABLE "ads" ALTER COLUMN "placement" SET DEFAULT 'HOME_BANNER';
COMMIT;

-- DropForeignKey
ALTER TABLE "church_community" DROP CONSTRAINT "church_community_church_id_fkey";

-- DropForeignKey
ALTER TABLE "church_community" DROP CONSTRAINT "church_community_church_member_id_fkey";

-- DropForeignKey
ALTER TABLE "church_community" DROP CONSTRAINT "church_community_user_id_fkey";

-- DropForeignKey
ALTER TABLE "community_comment" DROP CONSTRAINT "community_comment_church_member_id_fkey";

-- DropForeignKey
ALTER TABLE "community_comment" DROP CONSTRAINT "community_comment_post_id_fkey";

-- DropForeignKey
ALTER TABLE "community_comment_replies" DROP CONSTRAINT "community_comment_replies_church_member_id_fkey";

-- DropForeignKey
ALTER TABLE "community_comment_replies" DROP CONSTRAINT "community_comment_replies_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "community_post" DROP CONSTRAINT "community_post_church_member_id_fkey";

-- DropForeignKey
ALTER TABLE "community_post" DROP CONSTRAINT "community_post_community_id_fkey";

-- DropForeignKey
ALTER TABLE "community_post_react" DROP CONSTRAINT "community_post_react_church_member_id_fkey";

-- DropForeignKey
ALTER TABLE "community_post_react" DROP CONSTRAINT "community_post_react_post_id_fkey";

-- DropTable
DROP TABLE "church_community";

-- DropTable
DROP TABLE "community_comment";

-- DropTable
DROP TABLE "community_comment_replies";

-- DropTable
DROP TABLE "community_post";

-- DropTable
DROP TABLE "community_post_react";

-- DropEnum
DROP TYPE "ReactType";
