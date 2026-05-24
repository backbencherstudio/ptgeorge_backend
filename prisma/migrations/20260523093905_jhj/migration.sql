/*
  Warnings:

  - The values [LIKE] on the enum `ReactType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReactType_new" AS ENUM ('LOVE');
ALTER TABLE "community_post_react" ALTER COLUMN "react_type" TYPE "ReactType_new" USING ("react_type"::text::"ReactType_new");
ALTER TYPE "ReactType" RENAME TO "ReactType_old";
ALTER TYPE "ReactType_new" RENAME TO "ReactType";
DROP TYPE "public"."ReactType_old";
COMMIT;

-- CreateTable
CREATE TABLE "community_comment_replies" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "image" TEXT[],
    "comment_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "community_comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_comment_replies_comment_id_idx" ON "community_comment_replies"("comment_id");

-- CreateIndex
CREATE INDEX "community_comment_replies_church_member_id_idx" ON "community_comment_replies"("church_member_id");

-- AddForeignKey
ALTER TABLE "community_comment_replies" ADD CONSTRAINT "community_comment_replies_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_replies" ADD CONSTRAINT "community_comment_replies_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
