/*
  Warnings:

  - You are about to drop the column `catagory` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `companmy_name` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "catagory",
DROP COLUMN "companmy_name",
ADD COLUMN     "category" VARCHAR(255),
ADD COLUMN     "company_name" VARCHAR(255);
