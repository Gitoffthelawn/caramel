// lib/couponSignals.ts
//
// App-owned trust telemetry for the coupon catalog (W1 of the Coupons
// Ownership Inversion + Trust Loop). This is the ONE place any
// `coupon_signals` Prisma access lives — written by POST
// /api/coupons/[id]/report (the extension will call it in W2) and read back by
// attachSignals() to surface "worked Xh ago" on the web card + popup.
//
// It writes ONLY our own Postgres (DATABASE_URL) via prisma. It NEVER touches
// the external read-only caramel_coupons catalog (couponsDb.ts) — the whole
// point of the trust loop is to own this signal ourselves rather than mirror
// (or mutate) the externally-owned catalog. Signals are keyed by the catalog
// coupon id as a string, matching the app's Coupon.id: string.
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'

/** Extension reported this coupon worked at checkout — bump the work counter and stamp the time. */
export async function recordWorked(couponId: string): Promise<void> {
    await prisma.couponSignal.upsert({
        where: { couponId },
        create: { couponId, workCount: 1, lastWorkedAt: new Date() },
        update: { workCount: { increment: 1 }, lastWorkedAt: new Date() },
    })
}

/** Extension reported this coupon failed — bump the fail counter, stamp the time + the (already-bounded) store/verifier reason. */
export async function recordFailed(
    couponId: string,
    reason?: string | null,
): Promise<void> {
    // `reason` is already length-bounded by the report route's zod body schema
    // (trim().max(200)); passed straight through — no second-guessing a value
    // the boundary already validated.
    await prisma.couponSignal.upsert({
        where: { couponId },
        create: {
            couponId,
            failCount: 1,
            lastFailedAt: new Date(),
            lastFailReason: reason ?? null,
        },
        update: {
            failCount: { increment: 1 },
            lastFailedAt: new Date(),
            lastFailReason: reason ?? null,
        },
    })
}

/**
 * Attach each coupon's app-owned `lastWorkedAt` (an ISO string, or null when
 * we hold no signal for it) via a single keyed lookup — the "merge, not SQL
 * join" boundary. The coupon rows come from the external catalog (couponsRepo,
 * unchanged); the signal comes from OUR Postgres; the two are joined here in
 * application code, never across the DB boundary. Empty-in → empty-out, so a
 * page with no coupons issues no query.
 *
 * NON-FATAL: the trust overlay is non-critical. A signal-store failure — or an
 * environment whose `coupon_signals` migration hasn't run yet — degrades to
 * no-signal (every coupon's `lastWorkedAt: null`) and is reported to Sentry; it
 * must NEVER 500 the core coupon listing this result merges into.
 */
export async function attachSignals<T extends { id: string }>(
    coupons: T[],
): Promise<(T & { lastWorkedAt: string | null })[]> {
    if (coupons.length === 0) return []

    try {
        const ids = coupons.map(coupon => coupon.id)
        const signals = await prisma.couponSignal.findMany({
            where: { couponId: { in: ids } },
            select: { couponId: true, lastWorkedAt: true },
        })
        const workedAtById = new Map(
            signals.map(
                signal => [signal.couponId, signal.lastWorkedAt] as const,
            ),
        )

        return coupons.map(coupon => ({
            ...coupon,
            lastWorkedAt: workedAtById.get(coupon.id)?.toISOString() ?? null,
        }))
    } catch (error) {
        // Trust overlay is non-critical — degrade LOUDLY (Sentry), never throw.
        Sentry.captureException(error, {
            tags: { area: 'couponSignals.attachSignals' },
        })
        console.warn(
            '[couponSignals] attachSignals failed — serving coupons without the trust overlay:',
            error,
        )
        return coupons.map(coupon => ({ ...coupon, lastWorkedAt: null }))
    }
}
