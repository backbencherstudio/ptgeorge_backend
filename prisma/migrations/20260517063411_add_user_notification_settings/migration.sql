/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `NotificationEvent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationSettingType" AS ENUM ('NEW_REQUEST_ALERT', 'APPROVAL_CONFIRMATION', 'ROLE_ASSIGNMENT_ALERT');

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "deleted_at";

-- AlterTable
ALTER TABLE "NotificationEvent" DROP COLUMN "deleted_at";

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationSettingType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notification_settings_user_id_idx" ON "user_notification_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_user_id_type_key" ON "user_notification_settings"("user_id", "type");

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
