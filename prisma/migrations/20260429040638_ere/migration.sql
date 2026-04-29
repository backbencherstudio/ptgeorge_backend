/*
  Warnings:

  - Made the column `church_name` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `church_city` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `church_email` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `church_domain` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `church_password` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `church_adminname` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `churches` required. This step will fail if there are existing NULL values in that column.
  - Made the column `auth_type` on table `churches` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "churches" ALTER COLUMN "church_name" SET NOT NULL,
ALTER COLUMN "church_city" SET NOT NULL,
ALTER COLUMN "church_email" SET NOT NULL,
ALTER COLUMN "church_domain" SET NOT NULL,
ALTER COLUMN "church_password" SET NOT NULL,
ALTER COLUMN "church_adminname" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "auth_type" SET NOT NULL;
