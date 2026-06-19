'use client'

import type { Coupon, CouponStatus } from '@/types/coupon'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'

interface CouponCardProps {
    coupon: Coupon
    index: number
}

// Verification badge: green = machine-verified, amber = verified-but-restricted,
// grey = not yet verified (grace), red = known not valid.
const AMBER =
    'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-900/50'
const GREY =
    'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
const RED =
    'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-900/50'
const STATUS_BADGE: Record<CouponStatus, { label: string; cls: string }> = {
    valid: {
        label: '✓ Verified',
        cls: 'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-900/50',
    },
    valid_with_warning: { label: 'Verified · may vary', cls: AMBER },
    product_restriction: { label: 'Restrictions apply', cls: AMBER },
    category_restricted: { label: 'Category-limited', cls: AMBER },
    seller_specific: { label: 'Seller-specific', cls: AMBER },
    pending: { label: 'Unverified', cls: GREY },
    retry: { label: 'Checking…', cls: GREY },
    invalid: { label: 'Not valid', cls: RED },
    expired: { label: 'Expired', cls: RED },
}

export default function CouponCard({ coupon, index }: CouponCardProps) {
    const [showCode, setShowCode] = useState(false)

    const handleCopyCode = async () => {
        if (coupon.code) {
            await navigator.clipboard.writeText(coupon.code)
            toast.success('Coupon code copied!')
            setShowCode(true)
            setTimeout(() => setShowCode(false), 3000)
        }
    }

    const discount = coupon.discount_amount
        ? coupon.discount_type === 'PERCENTAGE'
            ? `${coupon.discount_amount}%`
            : `$${coupon.discount_amount}`
        : '20%'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/40 p-5 shadow-md transition-all hover:shadow-lg dark:border-orange-900/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
        >
            <div className="flex items-center gap-5 md:flex-col md:items-start">
                {/* Left: Discount Badge */}
                <div className="from-caramel flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br to-orange-600 text-white shadow-md ring-1 ring-orange-200 dark:ring-orange-900/50">
                    <div className="text-center leading-tight">
                        <span className="block text-xl font-black md:text-lg">
                            {discount}
                        </span>
                        <span className="text-[11px] font-semibold text-white/90">
                            off
                        </span>
                    </div>
                </div>

                {/* Middle: Content */}
                <div className="min-w-0 flex-1">
                    <h3 className="mb-1 line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                        {coupon.title}
                    </h3>
                    {coupon.description && (
                        <p className="mb-2 line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
                            {coupon.description}
                        </p>
                    )}
                    {(coupon.timesUsed ?? 0) > 0 && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {coupon.timesUsed} used today
                        </p>
                    )}
                    {coupon.status && STATUS_BADGE[coupon.status] && (
                        <span
                            title={coupon.verificationMessage ?? undefined}
                            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_BADGE[coupon.status].cls}`}
                        >
                            {STATUS_BADGE[coupon.status].label}
                        </span>
                    )}
                </div>

                {/* Right: CTA Button */}
                <div className="shrink-0 md:w-full">
                    <button
                        onClick={handleCopyCode}
                        className="from-caramel whitespace-nowrap rounded-2xl bg-gradient-to-r to-orange-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg md:w-full"
                    >
                        Get Coupon Code
                    </button>
                </div>
            </div>

            {/* Hover Overlay - Show Code */}
            {showCode && coupon.code && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                >
                    <div className="text-center">
                        <p className="mb-2 text-sm text-gray-300">Your Code:</p>
                        <p className="from-caramel mb-3 bg-gradient-to-r to-orange-600 bg-clip-text text-3xl font-black text-transparent">
                            {coupon.code}
                        </p>
                        <p className="text-xs text-gray-400">
                            Code copied to clipboard!
                        </p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}
