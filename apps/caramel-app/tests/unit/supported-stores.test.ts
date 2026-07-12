import { GET } from '@/app/api/extension/supported-stores/route'
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// F-003 — GET /api/extension/supported-stores becomes a public read: the
// payload is xpath selectors already shipped to every extension install, so
// gating it behind a key has no secrecy value. Rate-limited like any other
// public read route. A stale x-api-key header from a pre-F-003 extension
// build is simply ignored — no cutover required (see PLAN-F-003.md §Breaking).

// F-001 — re-export the REAL schemas/parseCouponRows via importActual and
// only replace couponsSql itself: the route now imports parseCouponRows +
// StoreConfigRowSchema from this module too, and a factory that provided
// just `{ couponsSql }` would leave those undefined (TypeError before the
// SQL mock is ever reached). An empty-array result parses through the real
// schema trivially, so this stays a true characterization of unchanged
// behavior.
vi.mock('@/lib/couponsDb', async () => {
    const actual =
        await vi.importActual<typeof import('@/lib/couponsDb')>(
            '@/lib/couponsDb',
        )
    return {
        ...actual,
        couponsSql: (
            _strings: TemplateStringsArray,
            ..._values: unknown[]
        ) => ({
            // oxlint-disable-next-line no-thenable
            then: (resolve: (rows: unknown[]) => void) => resolve([]),
        }),
    }
})

const { checkRateLimitMock } = vi.hoisted(() => ({
    checkRateLimitMock: vi.fn(async () => null as NextResponse | null),
}))
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: checkRateLimitMock }))

function makeRequest(headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/extension/supported-stores', {
        headers,
    })
}

beforeEach(() => {
    checkRateLimitMock.mockClear()
    checkRateLimitMock.mockImplementation(async () => null)
})

describe('GET /api/extension/supported-stores — public read (F-003)', () => {
    it('no key header → 200', async () => {
        const res = await GET(makeRequest())
        expect(res.status).toBe(200)
    })

    it('a stale x-api-key header from a pre-F-003 extension build is ignored → 200', async () => {
        const res = await GET(
            makeRequest({
                'x-api-key': 'WXqEpm2uOV5jjJXPpnQFyZiNdaPVUrtd2LIrf4kc1JA',
            }),
        )
        expect(res.status).toBe(200)
    })

    it('rate limiting is delegated to checkRateLimit — a 429 from it passes through untouched', async () => {
        const limited = NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 },
        )
        checkRateLimitMock.mockImplementation(async () => limited)

        const res = await GET(makeRequest())

        expect(res.status).toBe(429)
        expect(checkRateLimitMock).toHaveBeenCalledWith(
            expect.anything(),
            'read',
        )
    })
})
