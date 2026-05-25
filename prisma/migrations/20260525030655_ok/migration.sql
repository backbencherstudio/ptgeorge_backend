-- CreateEnum
CREATE TYPE "ReactType" AS ENUM ('LIKE', 'LOVE');

-- CreateTable
CREATE TABLE "church_posts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "image" TEXT,
    "content" TEXT,
    "church_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "church_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_comments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "image" TEXT,
    "post_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "church_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_comment_replies" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "image" TEXT,
    "comment_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "church_comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_post_reacts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "react_type" "ReactType" NOT NULL DEFAULT 'LOVE',
    "post_id" TEXT NOT NULL,
    "church_member_id" TEXT NOT NULL,

    CONSTRAINT "church_post_reacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "church_posts_church_id_idx" ON "church_posts"("church_id");

-- CreateIndex
CREATE INDEX "church_posts_church_member_id_idx" ON "church_posts"("church_member_id");

-- CreateIndex
CREATE INDEX "church_posts_created_at_idx" ON "church_posts"("created_at");

-- CreateIndex
CREATE INDEX "church_comments_post_id_idx" ON "church_comments"("post_id");

-- CreateIndex
CREATE INDEX "church_comments_church_member_id_idx" ON "church_comments"("church_member_id");

-- CreateIndex
CREATE INDEX "church_comments_created_at_idx" ON "church_comments"("created_at");

-- CreateIndex
CREATE INDEX "church_comment_replies_comment_id_idx" ON "church_comment_replies"("comment_id");

-- CreateIndex
CREATE INDEX "church_comment_replies_church_member_id_idx" ON "church_comment_replies"("church_member_id");

-- CreateIndex
CREATE INDEX "church_comment_replies_created_at_idx" ON "church_comment_replies"("created_at");

-- CreateIndex
CREATE INDEX "church_post_reacts_post_id_idx" ON "church_post_reacts"("post_id");

-- CreateIndex
CREATE INDEX "church_post_reacts_church_member_id_idx" ON "church_post_reacts"("church_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "church_post_reacts_post_id_church_member_id_key" ON "church_post_reacts"("post_id", "church_member_id");

-- AddForeignKey
ALTER TABLE "church_posts" ADD CONSTRAINT "church_posts_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_posts" ADD CONSTRAINT "church_posts_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_comments" ADD CONSTRAINT "church_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "church_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_comments" ADD CONSTRAINT "church_comments_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_comment_replies" ADD CONSTRAINT "church_comment_replies_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "church_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_comment_replies" ADD CONSTRAINT "church_comment_replies_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_post_reacts" ADD CONSTRAINT "church_post_reacts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "church_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_post_reacts" ADD CONSTRAINT "church_post_reacts_church_member_id_fkey" FOREIGN KEY ("church_member_id") REFERENCES "church_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
