import { handleRouteError } from '@/lib/api/handleRouteError'
import {
    SiteCountRowSchema,
    couponsSql,
    parseCouponRows,
} from '@/lib/couponsDb'
import { checkRateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const limited = await checkRateLimit(req, 'read')
    if (limited) return limited

    try {
        const rawRows = await couponsSql`
            SELECT site, COUNT(*)::int AS coupon_count
            FROM coupons
            WHERE status IN ('valid','valid_with_warning','product_restriction','category_restricted','seller_specific','pending','retry') AND expired = FALSE
            GROUP BY site
            ORDER BY coupon_count DESC
            LIMIT 4
        `
        const rows = parseCouponRows(
            SiteCountRowSchema,
            rawRows,
            'sites.top-sites',
        )
        // No .filter(Boolean) here — unlike stores/route.ts and
        // search-supported/route.ts, this pre-existing behavior is
        // preserved as-is (out of scope for F-001; a null GROUP BY site
        // was already possible pre-zod and would already have passed
        // straight through as a raw driver value).
        const sites = rows.map(r => r.site)
        return NextResponse.json(
            { sites },
            {
                headers: {
                    'Cache-Control':
                        'public, s-maxage=300, stale-while-revalidate=300',
                },
            },
        )
    } catch (err) {
        console.error('Failed to fetch top sites:', err)
        return handleRouteError(err, {
            req,
            message: 'Failed to fetch top sites',
        })
    }
}
