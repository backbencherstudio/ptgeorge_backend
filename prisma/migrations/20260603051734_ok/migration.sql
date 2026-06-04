-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'ASSIGN', 'REVOKE', 'APPROVE', 'REJECT', 'SUSPEND', 'ACTIVATE', 'EXPORT', 'LOGIN', 'LOGOUT', 'CHANGE_STATUS', 'MANAGE_PERMISSIONS', 'MANAGE_ROLES', 'MANAGE_CHURCH', 'MANAGE_USERS', 'DELETED_PERMISSION', 'ASSIGNED_ROLE', 'REVOKED_ROLE');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "church" TEXT,
    "actor_id" TEXT,
    "actor_type" TEXT,
    "church_id" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_church_id_idx" ON "audit_logs"("church_id");

-- CreateIndex
CREATE INDEX "audit_logs_church_idx" ON "audit_logs"("church");
