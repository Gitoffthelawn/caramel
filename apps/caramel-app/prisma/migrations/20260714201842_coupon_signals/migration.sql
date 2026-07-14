-- CreateTable
CREATE TABLE "public"."coupon_signals" (
    "coupon_id" TEXT NOT NULL,
    "last_worked_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "work_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "last_fail_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_signals_pkey" PRIMARY KEY ("coupon_id")
);
