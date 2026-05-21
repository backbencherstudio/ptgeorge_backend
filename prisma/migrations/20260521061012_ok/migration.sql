/*
  Warnings:

  - You are about to drop the column `church_id` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_church_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "church_id";
