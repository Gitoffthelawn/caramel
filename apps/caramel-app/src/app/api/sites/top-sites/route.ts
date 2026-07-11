import { handleRouteError } from '@/lib/api/handleRouteError'
import { withRoute } from '@/lib/api/withRoute'
import {
    SiteCountRowSchema,
    couponsSql,
    parseCouponRows,
    visibleCouponsWhere,
} from '@/lib/couponsDb'
import { NextResponse } from 'next/server'

export const GET = withRoute(
    { method: 'GET', routeName: 'sites/top-sites', rateLimit: 'read' },
    async ({ req }) => {
        try {
            const rawRows = await couponsSql`
            SELECT site, COUNT(*)::int AS coupon_count
            FROM coupons
            WHERE ${visibleCouponsWhere()}
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
    },
)
