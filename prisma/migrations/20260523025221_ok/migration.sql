-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('ACTIVE', 'PAUSED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HOME_BANNER', 'SIDEBAR', 'IN_ARTICLE', 'POPUP', 'FULLSCREEN', 'CHURCH_FEED', 'COMMUNITY_FEED');

-- CreateEnum
CREATE TYPE "AdTargetType" AS ENUM ('ALL_LOCATIONS', 'SPECIFIC_CITIES', 'SPECIFIC_STATES', 'SPECIFIC_COUNTRIES');

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "link" VARCHAR(500) NOT NULL,
    "thumbnail" VARCHAR(500) NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'ACTIVE',
    "placement" "AdPlacement" NOT NULL DEFAULT 'HOME_BANNER',
    "target_type" "AdTargetType" NOT NULL DEFAULT 'ALL_LOCATIONS',
    "countries" TEXT[],
    "cities" TEXT[],
    "states" TEXT[],
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "church_id" TEXT,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_views" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ad_id" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "ad_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ad_id" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ad_id" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_status_idx" ON "ads"("status");

-- CreateIndex
CREATE INDEX "ads_placement_idx" ON "ads"("placement");

-- CreateIndex
CREATE INDEX "ads_start_date_end_date_idx" ON "ads"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "ad_views_ad_id_idx" ON "ad_views"("ad_id");

-- CreateIndex
CREATE INDEX "ad_views_created_at_idx" ON "ad_views"("created_at");

-- CreateIndex
CREATE INDEX "ad_clicks_ad_id_idx" ON "ad_clicks"("ad_id");

-- CreateIndex
CREATE INDEX "ad_clicks_created_at_idx" ON "ad_clicks"("created_at");

-- CreateIndex
CREATE INDEX "ad_metrics_ad_id_idx" ON "ad_metrics"("ad_id");

-- CreateIndex
CREATE INDEX "ad_metrics_date_idx" ON "ad_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_metrics_ad_id_date_key" ON "ad_metrics"("ad_id", "date");

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_metrics" ADD CONSTRAINT "ad_metrics_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
