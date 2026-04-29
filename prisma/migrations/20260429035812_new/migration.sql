-- CreateEnum
CREATE TYPE "ChurchAuthType" AS ENUM ('SYSTEM_ADMIN', 'EDITOR', 'HELPER', 'CHURCH_ADMIN');

-- CreateEnum
CREATE TYPE "ChurchStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "churches" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "church_name" VARCHAR(255),
    "church_city" VARCHAR(255),
    "church_email" VARCHAR(255),
    "church_domain" VARCHAR(255),
    "church_password" VARCHAR(255),
    "church_adminname" VARCHAR(255),
    "status" "ChurchStatus" DEFAULT 'PENDING',
    "auth_type" "ChurchAuthType" DEFAULT 'CHURCH_ADMIN',

    CONSTRAINT "churches_pkey" PRIMARY KEY ("id")
);
