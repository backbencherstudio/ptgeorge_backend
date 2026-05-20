-- CreateEnum
CREATE TYPE "ChurchMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateTable
CREATE TABLE "church_members" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "church_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "church_role" VARCHAR(100),
    "status" "ChurchMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "church_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "church_members_church_id_idx" ON "church_members"("church_id");

-- CreateIndex
CREATE INDEX "church_members_user_id_idx" ON "church_members"("user_id");

-- CreateIndex
CREATE INDEX "church_members_status_idx" ON "church_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "church_members_church_id_user_id_key" ON "church_members"("church_id", "user_id");

-- AddForeignKey
ALTER TABLE "church_members" ADD CONSTRAINT "church_members_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_members" ADD CONSTRAINT "church_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
