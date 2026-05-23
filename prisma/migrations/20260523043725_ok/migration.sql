-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL_USERS', 'CHURCH_ADMINS_ONLY', 'SUPER_ADMINS_ONLY', 'SPECIFIC_CHURCHES');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL_USERS',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "target_church_ids" JSONB,
    "created_by_id" TEXT NOT NULL,
    "church_id" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_status_idx" ON "announcements"("status");

-- CreateIndex
CREATE INDEX "announcements_audience_idx" ON "announcements"("audience");

-- CreateIndex
CREATE INDEX "announcements_start_date_end_date_idx" ON "announcements"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

-- CreateIndex
CREATE INDEX "announcements_church_id_idx" ON "announcements"("church_id");

-- CreateIndex
CREATE INDEX "announcements_created_by_id_idx" ON "announcements"("created_by_id");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
