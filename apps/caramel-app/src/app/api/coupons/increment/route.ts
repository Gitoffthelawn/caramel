import { couponsSql } from '@/lib/couponsDb'
import {
    checkRateLimit,
    forbiddenOrigin,
    isOriginAllowed,
} from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Usage counter for a coupon. POST (not GET) so it can't be triggered by
// browser/CDN prefetch — a mutation must never ride a cacheable GET.
// id accepted via ?id= (back-compat) or JSON body; coupons.id is an integer.
export async function POST(req: NextRequest) {
    if (!isOriginAllowed(req)) return forbiddenOrigin()
    const limited = await checkRateLimit(req, 'mutation')
    if (limited) return limited

    const url = new URL(req.url)
    let idRaw = url.searchParams.get('id') || ''
    if (!idRaw) {
        const body = (await req.json().catch(() => ({}))) as { id?: unknown }
        idRaw = body?.id != null ? String(body.id) : ''
    }
    if (!/^\d{1,18}$/.test(idRaw)) {
        return NextResponse.json(
            { error: 'Invalid or missing coupon ID' },
            { status: 400 },
        )
    }
    const id = Number(idRaw)

    try {
        const rows = await couponsSql`
            UPDATE coupons
            SET times_used = times_used + 1,
                last_time_used = NOW(),
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, code, site,
                      times_used AS "timesUsed",
                      last_time_used AS "last_time_used"
        `
        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Coupon not found' },
                { status: 404 },
            )
        }
        return NextResponse.json(rows[0])
    } catch (error) {
        console.error('Error incrementing coupon usage:', error)
        return NextResponse.json(
            { error: 'Error updating coupon usage.' },
            { status: 500 },
        )
    }
}
