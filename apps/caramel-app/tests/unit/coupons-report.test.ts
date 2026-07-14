import { POST } from '@/app/api/coupons/[id]/report/route'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Report-route unit pins — the app side of the trust loop (W1). Mirrors
// coupons-expire.test.ts's shape: mock the DB the signal lives in (here
// @/lib/prisma — the app Postgres, NOT the external catalog) and drive the
// exported POST with a constructed NextRequest. Proves the id is parsed from
// the PATH (withRoute doesn't thread Next's route params), that each outcome
// routes to the right recorder, and that the withRoute body gate rejects a
// bad outcome before anything is written.
const { prismaMock } = vi.hoisted(() => ({
    prismaMock: {
        couponSignal: {
            upsert: vi.fn(
                async (args: {
                    where: { couponId: string }
                    create: Record<string, unknown>
                    update: Record<string, unknown>
                }) => ({ couponId: args.where.couponId }),
            ),
        },
    },
}))
vi.mock('@/lib/prisma', () => ({ default: prismaMock }))

// Keep isOriginAllowed real (a no-Origin request passes, like the extension's
// host_permissions fetch); only the rate-limit round-trip is stubbed out.
vi.mock('@/lib/rateLimit', async importOriginal => {
    const actual = await importOriginal<typeof import('@/lib/rateLimit')>()
    return { ...actual, checkRateLimit: vi.fn(async () => null) }
})

function reportRequest(id: string, body: unknown) {
    return new NextRequest(`http://localhost/api/coupons/${id}/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })
}

beforeEach(() => {
    prismaMock.couponSignal.upsert.mockClear()
})

describe('POST /api/coupons/[id]/report — app-owned trust signal (W1)', () => {
    it('outcome "worked" → 200 {ok:true}, upserts a work signal keyed by the PATH id', async () => {
        const res = await POST(reportRequest('42', { outcome: 'worked' }))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
        expect(prismaMock.couponSignal.upsert).toHaveBeenCalledTimes(1)
        const arg = prismaMock.couponSignal.upsert.mock.calls[0]![0]
        expect(arg.where).toEqual({ couponId: '42' })
        expect(arg.create).toMatchObject({ couponId: '42', workCount: 1 })
        expect(arg.create.lastWorkedAt).toBeInstanceOf(Date)
        expect(arg.update).toMatchObject({ workCount: { increment: 1 } })
    })

    it('outcome "failed" with a storeReason → 200, upserts a fail signal carrying the reason', async () => {
        const res = await POST(
            reportRequest('42', {
                outcome: 'failed',
                storeReason: 'Minimum spend not met',
            }),
        )

        expect(res.status).toBe(200)
        expect(prismaMock.couponSignal.upsert).toHaveBeenCalledTimes(1)
        const arg = prismaMock.couponSignal.upsert.mock.calls[0]![0]
        expect(arg.create).toMatchObject({
            couponId: '42',
            failCount: 1,
            lastFailReason: 'Minimum spend not met',
        })
        expect(arg.update).toMatchObject({
            failCount: { increment: 1 },
            lastFailReason: 'Minimum spend not met',
        })
    })

    it('a non-numeric id (abc) → 400, nothing written', async () => {
        const res = await POST(reportRequest('abc', { outcome: 'worked' }))

        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({
            error: 'Invalid or missing coupon ID',
        })
        expect(prismaMock.couponSignal.upsert).not.toHaveBeenCalled()
    })

    it('an invalid outcome → 422 (withRoute body gate), nothing written', async () => {
        const res = await POST(reportRequest('42', { outcome: 'maybe' }))

        expect(res.status).toBe(422)
        expect(prismaMock.couponSignal.upsert).not.toHaveBeenCalled()
    })
})
