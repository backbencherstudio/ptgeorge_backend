/*
  Warnings:

  - A unique constraint covering the columns `[post_id,church_member_id]` on the table `community_post_react` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "community_post_react" ALTER COLUMN "react_type" SET DEFAULT 'LOVE';

-- CreateIndex
CREATE INDEX "community_post_react_post_id_idx" ON "community_post_react"("post_id");

-- CreateIndex
CREATE INDEX "community_post_react_church_member_id_idx" ON "community_post_react"("church_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_react_post_id_church_member_id_key" ON "community_post_react"("post_id", "church_member_id");
