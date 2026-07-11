import { handleRouteError } from '@/lib/api/handleRouteError'
import {
    DiscountTypeRowSchema,
    SiteRowSchema,
    couponsSql,
    parseCouponRows,
    visibleCouponsWhere,
} from '@/lib/couponsDb'
import { checkRateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const limited = await checkRateLimit(req, 'read')
    if (limited) return limited

    const url = new URL(req.url)
    const includeSitesParam = url.searchParams.get('includeSites')
    const includeSites = includeSitesParam !== 'false'
    const rawLimit = parseInt(url.searchParams.get('sitesLimit') || '20', 10)
    const sitesLimit = Math.min(Math.max(rawLimit, 0), 100)

    try {
        // F-006 — unified to the same visibleCouponsWhere() predicate every
        // other coupon read route uses. Previously this route alone used a
        // narrower 'valid'-only + expired=FALSE filter, an accidental drift
        // that made these dropdowns under-represent sites/types whose
        // coupons are pending/restricted-but-real (visible in /api/coupons
        // and the store page, but absent from these filter options).
        // Deliberate, flagged behavior change: broadens the site/type
        // filter lists to match the listing they filter. Rollback (if ever
        // needed): swap visibleCouponsWhere() back to `status = 'valid'`
        // (+ `AND expired = FALSE`) in both queries below.
        const sitesPromise =
            includeSites && sitesLimit > 0
                ? couponsSql`
                      SELECT DISTINCT site FROM coupons
                      WHERE ${visibleCouponsWhere()} AND site IS NOT NULL
                      ORDER BY site ASC
                      LIMIT ${sitesLimit}
                  `
                : Promise.resolve([])

        const typesPromise = couponsSql`
            SELECT DISTINCT discount_type FROM coupons
            WHERE ${visibleCouponsWhere()} AND discount_type IS NOT NULL
        `

        const [rawSites, rawDiscountTypes] = await Promise.all([
            sitesPromise,
            typesPromise,
        ])
        const sitesRaw = parseCouponRows(
            SiteRowSchema,
            rawSites,
            'coupons.filters.sites',
        )
        const discountTypesRaw = parseCouponRows(
            DiscountTypeRowSchema,
            rawDiscountTypes,
            'coupons.filters.types',
        )

        const sites = sitesRaw
            .map(s => s.site)
            .filter((site): site is string => Boolean(site))
            .sort((a, b) => a.localeCompare(b))
        const discountTypes = Array.from(
            new Set(discountTypesRaw.map(d => d.discount_type).filter(Boolean)),
        )

        return NextResponse.json(
            { sites, discountTypes },
            {
                headers: {
                    'Cache-Control':
                        'public, s-maxage=300, stale-while-revalidate=300',
                },
            },
        )
    } catch (error) {
        console.error('Failed to load coupon filter metadata:', error)
        return handleRouteError(error, {
            req,
            message: 'Failed to load coupon filter metadata',
        })
    }
}
