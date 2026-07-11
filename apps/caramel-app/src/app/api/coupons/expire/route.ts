import { handleRouteError } from '@/lib/api/handleRouteError'
import { couponsSql } from '@/lib/couponsDb'
import {
    checkRateLimit,
    forbiddenOrigin,
    isOriginAllowed,
    isTrustedServer,
} from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Bulk-expire coupons. Privileged: this permanently flips `expired=TRUE`, so
// it requires the server-only COUPONS_ADMIN_SECRET bearer (never shipped to
// the extension or any client) — not just an origin check. Bounded to 50
// integer ids per call.
export async function POST(req: NextRequest) {
    if (!isOriginAllowed(req)) return forbiddenOrigin()

    if (!isTrustedServer(req)) {
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
        return handleRouteError(error, {
            req,
            message: 'Error marking coupons as expired.',
        })
    }
}
