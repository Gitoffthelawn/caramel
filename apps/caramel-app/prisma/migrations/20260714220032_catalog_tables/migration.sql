-- CreateTable
CREATE TABLE "public"."coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "site" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_type" TEXT,
    "discount_amount" DOUBLE PRECISION,
    "expiry" TEXT,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "last_time_used" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "verification_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."store_configs" (
    "store_name" TEXT NOT NULL,
    "show_input_xpath" TEXT,
    "dismiss_button_xpath" TEXT,
    "coupon_input_xpath" TEXT,
    "apply_button_xpath" TEXT,
    "price_container_xpath" TEXT,
    "success_indicator_xpath" TEXT,
    "error_indicator_xpath" TEXT,
    "coupon_remove_xpath" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_configs_pkey" PRIMARY KEY ("store_name")
);

-- CreateTable
CREATE TABLE "public"."sources" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "websites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupons_site_idx" ON "public"."coupons"("site");

-- CreateIndex
CREATE INDEX "coupons_status_expired_idx" ON "public"."coupons"("status", "expired");
