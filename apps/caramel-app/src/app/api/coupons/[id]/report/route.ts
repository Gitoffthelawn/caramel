import { withRoute } from '@/lib/api/withRoute'
import { recordFailed, recordWorked } from '@/lib/couponSignals'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// POST /api/coupons/[id]/report — the extension's "did this coupon work?"
// trust signal (W2 will send the reports; W1 ships the endpoint + rendering,
// so signals stay empty until then and "worked Xh ago" simply doesn't render).
// Mirrors coupons/increment/route.ts exactly: POST (never a cacheable GET) so
// a mutation can't ride a browser/CDN prefetch, origin-gated + rate-limited
// via withRoute, and — like increment — NO CORS / NO OPTIONS export: the MV3
// extension fetches with host_permissions, so its request bypasses CORS
// entirely (adding CORS/OPTIONS here would be dead ceremony).
//
// Writes ONLY the app-owned coupon_signals table (through couponSignals.ts) —
// NEVER the external read-only coupons catalog.
const ReportBodySchema = z.object({
    outcome: z.enum(['worked', 'failed']),
    // Optional free-text a store/verifier attached to a failure. Bounded here
    // (trim + max 200) so recordFailed can pass it straight through.
    storeReason: z.string().trim().max(200).optional(),
})

export const POST = withRoute(
    {
        method: 'POST',
        routeName: 'coupons/report',
        rateLimit: 'mutation',
        origin: true,
        body: ReportBodySchema,
    },
    async ({ req, body }) => {
        // withRoute threads ONLY `req` to the handler — it deliberately does
        // not forward Next's dynamic route `params` (a path param is
        // route-specific data, not a cross-cutting concern, so the shared
        // 16-route pipeline stays untouched). So parse the id out of the URL
        // path: `/api/coupons/<id>/report` → the second-to-last segment,
        // validated with the same /^\d{1,18}$/ integer shape
        // coupons/increment/route.ts uses (400 on a bad/missing id).
        const segments = new URL(req.url).pathname.split('/')
        const id = segments[segments.length - 2] ?? ''
        if (!/^\d{1,18}$/.test(id)) {
            return NextResponse.json(
                { error: 'Invalid or missing coupon ID' },
                { status: 400 },
            )
        }

        if (body.outcome === 'worked') {
            await recordWorked(id)
        } else {
            await recordFailed(id, body.storeReason ?? null)
        }
        // withRoute's try/catch routes any thrown error to Sentry (the
        // pipeline default) — no local catch needed.
        return NextResponse.json({ ok: true })
    },
)
