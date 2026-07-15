import { withRoute } from '@/lib/api/withRoute'
import { recordUsage } from '@/lib/couponSignals'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Lenient — `id` is coerced/validated by hand below exactly as before
// (PRESERVED per PLAN-F-007.md §Breaking, not tightened to 422): the
// schema only needs to accept whatever shape a caller sends without ever
// rejecting it itself, deferring to the same `!= null ? String(id) : ''`
// + regex check the route always did.
const IncrementBodySchema = z.object({
    id: z.unknown().optional(),
})

// Usage counter for a coupon. POST (not GET) so it can't be triggered by
// browser/CDN prefetch — a mutation must never ride a cacheable GET.
// id accepted via ?id= (back-compat) or JSON body.
//
// W4-D2 (RULING C′): usage telemetry is now the app-owned coupon_signals table
// via recordUsage(), NOT an `UPDATE coupons SET times_used…` on the external
// catalog — that write would bump the catalog row's updated_at and freeze it
// under the ingest only-if-newer rule. The signal is keyed by coupon id
// independently of catalog-row existence, so the upsert always succeeds: there
// is no "coupon not found" case, hence no 404 (the extension fire-and-forgets
// this call and reads nothing from the response — the HTTP contract stays POST
// / 200 / JSON, same auth + rate-limit + origin). DB errors are NOT swallowed:
// a throw from recordUsage propagates to withRoute's try/catch → handleRouteError
// → Sentry (same as coupons/[id]/report).
export const POST = withRoute(
    {
        method: 'POST',
        routeName: 'coupons/increment',
        rateLimit: 'mutation',
        origin: true,
        body: IncrementBodySchema,
    },
    async ({ req, body }) => {
        const url = new URL(req.url)
        let idRaw = url.searchParams.get('id') || ''
        if (!idRaw) {
            idRaw = body?.id != null ? String(body.id) : ''
        }
        if (!/^\d{1,18}$/.test(idRaw)) {
            return NextResponse.json(
                { error: 'Invalid or missing coupon ID' },
                { status: 400 },
            )
        }

        // idRaw is the validated numeric string — coupon ids are strings
        // app-side (Coupon.id: string, CouponSignal.couponId: string).
        await recordUsage(idRaw)
        return NextResponse.json({ ok: true })
    },
)
