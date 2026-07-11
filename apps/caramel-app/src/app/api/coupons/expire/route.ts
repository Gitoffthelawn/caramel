import { couponsSql } from '@/lib/couponsDb'
import { env } from '@/lib/env'
import {
    checkRateLimit,
    forbiddenOrigin,
    isOriginAllowed,
} from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Bulk-expire coupons. Privileged: this permanently flips `expired=TRUE`, so
// it requires the extension/server API key (x-api-key) — not just an origin
// check. Bounded to 50 integer ids per call.
export async function POST(req: NextRequest) {
    if (!isOriginAllowed(req)) return forbiddenOrigin()

    const key = req.headers.get('x-api-key')
    const expected = env.EXTENSION_API_KEY
    if (!expected || !key || key !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await checkRateLimit(req, 'mutation')
    if (limited) return limited

    const { ids = [] } = (await req.json().catch(() => ({}))) as {
        ids?: unknown[]
    }
    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ count: 0 })
    }
    if (ids.length > 50) {
        return NextResponse.json(
            { error: 'Too many ids (max 50)' },
            { status: 400 },
        )
    }
    const clean = Array.from(
        new Set(
            ids
                .map(i => String(i))
                .filter(s => /^\d{1,18}$/.test(s))
                .map(Number),
        ),
    )
    if (clean.length === 0) {
        return NextResponse.json({ count: 0 })
    }

    try {
        const rows = await couponsSql`
            UPDATE coupons
            SET expired = TRUE,
                expiry = NOW()::text,
                updated_at = NOW()
            WHERE id = ANY(${clean}) AND expired = FALSE
            RETURNING id
        `
        return NextResponse.json({ count: rows.length })
    } catch (error) {
        console.error('Error expiring coupons:', error)
        return NextResponse.json(
            { error: 'Error marking coupons as expired.' },
            { status: 500 },
        )
    }
}
