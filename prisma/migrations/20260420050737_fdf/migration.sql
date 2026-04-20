/*
  Warnings:

  - The values [CUSTOMER,VENDOR,EVENT_PLANNER,PROVIDER,CLIENT] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `phone_number` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `country` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `state` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `zip_code` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('ADMIN', 'CHURCH_ADMIN', 'USER', 'PRO_USER');
ALTER TABLE "public"."users" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "type" TYPE "UserType_new" USING ("type"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "users" ALTER COLUMN "type" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address_line1" VARCHAR(255),
ADD COLUMN     "address_line2" VARCHAR(255),
ADD COLUMN     "available_time" VARCHAR(255),
ADD COLUMN     "business_email" VARCHAR(255),
ADD COLUMN     "business_phone" VARCHAR(255),
ADD COLUMN     "business_portfolio" TEXT,
ADD COLUMN     "catagory" VARCHAR(255),
ADD COLUMN     "church_name" VARCHAR(255),
ADD COLUMN     "companmy_name" VARCHAR(255),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "profession" VARCHAR(255),
ADD COLUMN     "service" VARCHAR(255),
ADD COLUMN     "website" VARCHAR(255),
ADD COLUMN     "whatsapp_number" VARCHAR(255),
ALTER COLUMN "type" SET DEFAULT 'USER',
ALTER COLUMN "phone_number" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "country" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "state" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "zip_code" SET DATA TYPE VARCHAR(255);
