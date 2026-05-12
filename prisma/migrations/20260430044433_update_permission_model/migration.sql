/*
  Warnings:

  - The `status` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `action` column on the `permissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('manage', 'read', 'create', 'update', 'delete');

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "PermissionStatus" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "action",
ADD COLUMN     "action" "PermissionAction";

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "color" TEXT,
ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");
