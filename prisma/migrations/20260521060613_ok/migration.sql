-- AlterTable
ALTER TABLE "users" ADD COLUMN     "church_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
