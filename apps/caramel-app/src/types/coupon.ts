export type CouponStatus =
    | 'valid'
    | 'valid_with_warning'
    | 'product_restriction'
    | 'category_restricted'
    | 'seller_specific'
    | 'pending'
    | 'retry'
    | 'invalid'
    | 'expired'

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
