/*
  Warnings:

  - The values [CHURCH_MAIN_ADMIN,CHURCH_LEADER,PASTOR,ASSISTANT_PASTOR,BACKGROUND_CHECKER,HELPER,CHURCH_MEMBER,VERIFIED_PRO] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `church_password` on the `churches` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[church_email]` on the table `churches` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[church_domain]` on the table `churches` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CHURCH_ADMIN', 'USER', 'PRO_USER');
ALTER TABLE "public"."users" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "type" TYPE "UserType_new" USING ("type"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "users" ALTER COLUMN "type" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "churches" DROP COLUMN "church_password",
ALTER COLUMN "church_email" SET DATA TYPE TEXT,
ALTER COLUMN "church_domain" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "churches_church_email_key" ON "churches"("church_email");

-- CreateIndex
CREATE UNIQUE INDEX "churches_church_domain_key" ON "churches"("church_domain");
