-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserType" ADD VALUE 'CHURCH_MAIN_ADMIN';
ALTER TYPE "UserType" ADD VALUE 'CHURCH_LEADER';
ALTER TYPE "UserType" ADD VALUE 'PASTOR';
ALTER TYPE "UserType" ADD VALUE 'ASSISTANT_PASTOR';
ALTER TYPE "UserType" ADD VALUE 'BACKGROUND_CHECKER';
ALTER TYPE "UserType" ADD VALUE 'HELPER';
ALTER TYPE "UserType" ADD VALUE 'CHURCH_MEMBER';
ALTER TYPE "UserType" ADD VALUE 'VERIFIED_PRO';
