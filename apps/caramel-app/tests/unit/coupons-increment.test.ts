import { POST } from '@/app/api/coupons/increment/route'
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /api/coupons/increment route pins (W4-D2, RULING C′). The route no
// longer UPDATEs the external catalog's times_used — it bumps the app-owned
// coupon_signals via recordUsage(). Mock recordUsage (the app Postgres write)
// and drive the exported POST directly, mirroring coupons-report.test.ts:
// prove the /^\d{1,18}$/ id gate, that a valid call forwards the id as a STRING
// to recordUsage and returns 200 {ok:true} (no 404 — the signal is keyed
// independently of catalog-row existence), and that the origin + rate-limit
// wiring still short-circuits before anything is written.
const { recordUsageMock } = vi.hoisted(() => ({
    recordUsageMock: vi.fn(async () => undefined),
}))
vi.mock('@/lib/couponSignals', () => ({ recordUsage: recordUsageMock }))

// Keep isOriginAllowed real (a no-Origin request passes, like the extension's
// host_permissions fetch); make the rate-limit round-trip controllable so a
// 429 can be exercised without a real limiter.
const { checkRateLimitMock } = vi.hoisted(() => ({
    checkRateLimitMock: vi.fn(async () => null as NextResponse | null),
}))
vi.mock('@/lib/rateLimit', async importOriginal => {
    const actual = await importOriginal<typeof import('@/lib/rateLimit')>()
    return { ...actual, checkRateLimit: checkRateLimitMock }
})

function incrementRequest(opts: {
    query?: string
    body?: unknown
    origin?: string
}) {
    const headers: Record<string, string> = {
        'content-type': 'application/json',
    }
    if (opts.origin) headers.origin = opts.origin
    return new NextRequest(
        `http://localhost/api/coupons/increment${opts.query ?? ''}`,
        {
            method: 'POST',
            headers,
            body:
                opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        },
    )
}

beforeEach(() => {
    recordUsageMock.mockClear()
    checkRateLimitMock.mockReset()
    checkRateLimitMock.mockResolvedValue(null)
})

describe('POST /api/coupons/increment — app-owned usage counter (W4-D2)', () => {
    it('valid ?id= → 200 {ok:true}, forwards the id to recordUsage as a STRING', async () => {
        const res = await POST(incrementRequest({ query: '?id=42' }))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
        expect(recordUsageMock).toHaveBeenCalledTimes(1)
        // A string, not the number 42 — coupon ids are strings app-side.
        expect(recordUsageMock).toHaveBeenCalledWith('42')
    })

    it('valid id in the JSON body → 200, recordUsage gets the stringified id', async () => {
        const res = await POST(incrementRequest({ body: { id: 42 } }))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
        expect(recordUsageMock).toHaveBeenCalledWith('42')
    })

    it('a non-numeric id (abc) → 400, nothing recorded', async () => {
        const res = await POST(incrementRequest({ query: '?id=abc' }))

        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({
            error: 'Invalid or missing coupon ID',
        })
        expect(recordUsageMock).not.toHaveBeenCalled()
    })

    it('no id anywhere → 400, nothing recorded', async () => {
        const res = await POST(incrementRequest({ body: {} }))

        expect(res.status).toBe(400)
        expect(recordUsageMock).not.toHaveBeenCalled()
    })

    it('cross-origin request from a random website → 403 (origin gate), nothing recorded', async () => {
        const res = await POST(
            incrementRequest({
                query: '?id=42',
                origin: 'https://evil.example.com',
            }),
        )

        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'Forbidden origin' })
        expect(recordUsageMock).not.toHaveBeenCalled()
    })

    it('a rate-limited request → 429 (rate-limit wiring), nothing recorded', async () => {
        checkRateLimitMock.mockResolvedValueOnce(
            NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
        )
        const res = await POST(incrementRequest({ query: '?id=42' }))

        expect(res.status).toBe(429)
        expect(recordUsageMock).not.toHaveBeenCalled()
    })
})
