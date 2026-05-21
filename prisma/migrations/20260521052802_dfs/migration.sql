/*
  Warnings:

  - You are about to drop the column `church_id` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReactType" AS ENUM ('LIKE', 'LOVE');

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_church_id_fkey";

-- AlterTable
ALTER TABLE "churches" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "church_id",
ADD COLUMN     "fcm_token" TEXT;

-- CreateTable
CREATE TABLE "church_community" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "community_name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "church_community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "image" TEXT[],
    "community_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "community_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "image" TEXT[],
    "post_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "community_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_react" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "react_type" "ReactType" NOT NULL,
    "post_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "community_post_react_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "churches" ADD CONSTRAINT "churches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_community" ADD CONSTRAINT "church_community_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_community" ADD CONSTRAINT "church_community_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_community" ADD CONSTRAINT "church_community_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post" ADD CONSTRAINT "community_post_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "church_community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post" ADD CONSTRAINT "community_post_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment" ADD CONSTRAINT "community_comment_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_react" ADD CONSTRAINT "community_post_react_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_react" ADD CONSTRAINT "community_post_react_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
