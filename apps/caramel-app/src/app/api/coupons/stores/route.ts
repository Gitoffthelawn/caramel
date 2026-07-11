import { handleRouteError } from '@/lib/api/handleRouteError'
import { withRoute } from '@/lib/api/withRoute'
import {
    SiteRowSchema,
    couponsSql,
    parseCouponRows,
    visibleCouponsWhere,
} from '@/lib/couponsDb'
import { NextResponse } from 'next/server'

export const GET = withRoute(
    { method: 'GET', routeName: 'coupons/stores', rateLimit: 'read' },
    async ({ req }) => {
        const url = new URL(req.url)
        const q = url.searchParams.get('q')?.trim() || ''
        const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10)
        const limit = Math.min(Math.max(rawLimit, 1), 50)

        try {
            const rawRows = q
                ? await couponsSql`
                  SELECT DISTINCT site FROM coupons
                  WHERE ${visibleCouponsWhere()}
                    AND (site ILIKE ${'%' + q + '%'} OR site ILIKE ${q + '%'})
                  ORDER BY site ASC
                  LIMIT ${limit}
              `
                : await couponsSql`
                  SELECT DISTINCT site FROM coupons
                  WHERE ${visibleCouponsWhere()}
                  ORDER BY site ASC
                  LIMIT ${limit}
              `
            const rows = parseCouponRows(
                SiteRowSchema,
                rawRows,
                'coupons.stores',
            )

            const sites = rows.map(s => s.site).filter(Boolean)

            return NextResponse.json(
                { sites },
                {
                    headers: {
                        'Cache-Control':
                            'public, s-maxage=120, stale-while-revalidate=120',
                    },
                },
            )
        } catch (error) {
            console.error('Failed to load store options:', error)
            return handleRouteError(error, {
                req,
                message: 'Failed to load store options',
            })
        }
    },
)
