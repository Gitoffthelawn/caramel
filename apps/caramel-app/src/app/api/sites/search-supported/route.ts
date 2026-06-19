import { couponsSql } from '@/lib/couponsDb'
import { checkRateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Store-name autocomplete. Post-DB-split this must read the coupons catalog
// via couponsSql (the old Prisma "Coupon" model was dropped). Surfaces any
// store that has visible coupons (verified, restricted, or not-yet-verified).
export async function POST(req: NextRequest) {
    const limited = await checkRateLimit(req, 'read')
    if (limited) return limited

    let body: { query?: string } = {}
    try {
        body = (await req.json()) as { query?: string }
    } catch {}
    const q = String(body?.query ?? '')
        .trim()
        .slice(0, 100)
    if (!q) return NextResponse.json({ sites: [] })

    try {
        const rows = await couponsSql<Array<{ site: string }>>`
            SELECT DISTINCT site FROM coupons
            WHERE status IN ('valid','valid_with_warning','product_restriction','category_restricted','seller_specific','pending','retry')
              AND expired = FALSE
              AND (site ILIKE ${'%' + q + '%'} OR site ILIKE ${q + '%'})
            ORDER BY site ASC
            LIMIT 20
        `
        return NextResponse.json({
            sites: rows.map(r => r.site).filter(Boolean),
        })
    } catch (err) {
        console.error('search-supported failed:', err)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
}
