/*
  Warnings:

  - A unique constraint covering the columns `[user_id,skill_name]` on the table `skills` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "skills_user_id_key";

-- AlterTable
ALTER TABLE "skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "skills_user_id_skill_name_key" ON "skills"("user_id", "skill_name");
