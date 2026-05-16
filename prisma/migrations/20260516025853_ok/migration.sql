-- AlterTable
ALTER TABLE "role_users" ADD COLUMN     "assigned_by_id" TEXT,
ADD COLUMN     "churchId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "church_id" TEXT;

-- CreateTable
CREATE TABLE "role_assignment_rules" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_role_id" TEXT NOT NULL,
    "to_role_id" TEXT NOT NULL,

    CONSTRAINT "role_assignment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_rules_from_role_id_to_role_id_key" ON "role_assignment_rules"("from_role_id", "to_role_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_users" ADD CONSTRAINT "role_users_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_users" ADD CONSTRAINT "role_users_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment_rules" ADD CONSTRAINT "role_assignment_rules_from_role_id_fkey" FOREIGN KEY ("from_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment_rules" ADD CONSTRAINT "role_assignment_rules_to_role_id_fkey" FOREIGN KEY ("to_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
