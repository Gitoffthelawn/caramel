// F-006 — the status vocabulary's single source of truth moved to
// lib/coupons.ts (imported by both this 'use client'-safe type module and
// server-only couponsDb.ts). Re-exported here so existing importers
// (`import type { CouponStatus } from '@/types/coupon'`) keep resolving.
import type { CouponStatus } from '@/lib/coupons'

export type { CouponStatus }

export interface Coupon {
    id: string
    code: string
    site: string
    title: string
    description: string
    rating: number
    discount_type: 'PERCENTAGE' | 'CASH' | 'SAVE'
    discount_amount: number | null
    expiry: string
    expired: boolean
    timesUsed: number
    status?: CouponStatus
    verificationMessage?: string | null
}

export interface CouponFilters {
    search: string
    site: string
    type: 'all' | 'PERCENTAGE' | 'CASH' | 'SAVE'
}
