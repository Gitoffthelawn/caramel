import { GET as filtersGET } from '@/app/api/coupons/filters/route'
import { GET as couponsGET } from '@/app/api/coupons/route'
import { GET as statsGET } from '@/app/api/coupons/stats/route'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Characterization pins (F-004) — pin the CURRENT (already-drifted) coupon
// visibility predicate each route composes. F-006 will intentionally unify
// these three into one shared predicate and update these pins then.
//
// couponsDb.ts throws at import time when COUPONS_DATABASE_URL is unset
// (no coupons DB in unit/CI), so couponsSql is mocked via a factory (never
// loads the real module) as a recording tagged-template spy: it records
// `strings.join('?')` — the literal SQL text with '?' standing in for each
// interpolated value — per call, and every call resolves to `[]`. Recording
// only the literal text (not the values) is driver-independent and safe
// even though coupons/route.ts nests a prior couponsSql result
// (`whereClause`) as a value inside later calls.
const calls: string[] = []

vi.mock('@/lib/couponsDb', () => ({
    couponsSql: (strings: TemplateStringsArray, ..._values: unknown[]) => {
        calls.push(strings.join('?'))
        // Deliberate thenable mock — replicates the shape `postgres` tagged
        // templates return so `await couponsSql\`...\`` resolves in the
        // routes under test. The property MUST be named `then` for that to
        // work.
        // oxlint-disable-next-line no-thenable
        return { then: (resolve: (rows: unknown[]) => void) => resolve([]) }
    },
}))

vi.mock('@/lib/rateLimit', () => ({
    checkRateLimit: async () => null,
}))

beforeEach(() => {
    calls.length = 0
})

describe('coupon visibility predicates (route-composed SQL, characterization)', () => {
    it('coupons/route.ts: 7-status whitelist + expired = FALSE', async () => {
        const res = await couponsGET(
            new NextRequest('http://localhost/api/coupons'),
        )

        expect(res.status).toBe(200)
        expect(calls).toContain(
            "status IN ('valid','valid_with_warning','product_restriction','category_restricted','seller_specific','pending','retry') AND expired = FALSE",
        )
    })

    it("filters/route.ts: 'valid'-only + expired = FALSE + site IS NOT NULL", async () => {
        const res = await filtersGET(
            new NextRequest('http://localhost/api/coupons/filters'),
        )

        expect(res.status).toBe(200)
        expect(
            calls.some(s =>
                s.includes(
                    "WHERE status = 'valid' AND expired = FALSE AND site IS NOT NULL",
                ),
            ),
        ).toBe(true)
    })

    it("stats/route.ts: 'valid'-only, no expired filter in the WHERE (drift vs. the other two routes)", async () => {
        const res = await statsGET(
            new NextRequest('http://localhost/api/coupons/stats'),
        )

        expect(res.status).toBe(200)
        const statsCall = calls.find(s => s.includes('COUNT(*)'))
        expect(statsCall).toContain("WHERE status = 'valid'")
        expect(statsCall).not.toContain('expired = FALSE')
    })
})
