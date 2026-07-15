import { POST } from '@/app/api/coupons/expire/route'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// F-003 — POST /api/coupons/expire moves from the public x-api-key gate to
// a server-only COUPONS_ADMIN_SECRET bearer (mirrors src/lib/health.ts's
// authorize()), fail-closed when unset. The id-validation branches below
// are unchanged through the auth swap — asserting them here proves the
// swap is behavior-isolated (see PLAN-F-003.md §Test strategy).
//
// W4-D2: expireCoupons now UPDATEs the app's OWN coupons table via
// prisma.$executeRaw (which returns the affected-row count directly), not the
// porsager couponsSql — so the DB mock targets @/lib/prisma, and the route
// passes the validated ids through as STRINGS (the app Coupon.id is a string).

const calls: string[] = []
let affectedRows = 0

vi.mock('@/lib/prisma', () => ({
    default: {
        $executeRaw: (arg: { sql: string }) => {
            calls.push(arg.sql)
            return Promise.resolve(affectedRows)
        },
    },
}))

const { envMock } = vi.hoisted(() => ({
    envMock: { COUPONS_ADMIN_SECRET: undefined as string | undefined },
}))
vi.mock('@/lib/env', () => ({ env: envMock }))

const ADMIN_SECRET = 'test-admin-secret-F003'

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/coupons/expire', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
    })
}

function authedRequest(
    body: unknown,
    extraHeaders: Record<string, string> = {},
) {
    return makeRequest(body, {
        authorization: `Bearer ${ADMIN_SECRET}`,
        ...extraHeaders,
    })
}

beforeEach(() => {
    calls.length = 0
    affectedRows = 0
    envMock.COUPONS_ADMIN_SECRET = ADMIN_SECRET
})

describe('POST /api/coupons/expire — auth (F-003: server bearer)', () => {
    it('no Authorization header → 401', async () => {
        const res = await POST(makeRequest({ ids: [1] }))
        expect(res.status).toBe(401)
    })

    it('wrong bearer value → 401', async () => {
        const res = await POST(
            makeRequest({ ids: [1] }, { authorization: 'Bearer wrong-secret' }),
        )
        expect(res.status).toBe(401)
    })

    it('a stale x-api-key header (old extension key) grants nothing → 401', async () => {
        const res = await POST(
            makeRequest({ ids: [1] }, { 'x-api-key': ADMIN_SECRET }),
        )
        expect(res.status).toBe(401)
    })

    it('COUPONS_ADMIN_SECRET unset server-side → 401 even with a bearer sent (fail-closed)', async () => {
        envMock.COUPONS_ADMIN_SECRET = undefined
        const res = await POST(authedRequest({ ids: [1] }))
        expect(res.status).toBe(401)
    })

    it('valid bearer → reaches the handler (200)', async () => {
        const res = await POST(authedRequest({ ids: [] }))
        expect(res.status).toBe(200)
    })
})

describe('POST /api/coupons/expire — id validation (unchanged through the auth swap)', () => {
    it('empty ids → { count: 0 }, no query issued', async () => {
        const res = await POST(authedRequest({ ids: [] }))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ count: 0 })
        expect(calls.length).toBe(0)
    })

    it('missing ids → { count: 0 }', async () => {
        const res = await POST(authedRequest({}))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ count: 0 })
    })

    it('more than 50 ids → 400', async () => {
        const ids = Array.from({ length: 51 }, (_, i) => i + 1)
        const res = await POST(authedRequest({ ids }))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'Too many ids (max 50)' })
    })

    it('dedupes + drops non-matching ids (/^\\d{1,18}$/) before querying, returns { count }', async () => {
        affectedRows = 2
        const res = await POST(
            authedRequest({ ids: [1, '1', 2, 'abc', -1, 1.5, '3.14'] }),
        )
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ count: 2 })
        expect(calls.length).toBe(1)
        expect(calls[0]).toContain('UPDATE coupons')
    })

    it('all-invalid ids after filtering → { count: 0 }, no query issued', async () => {
        const res = await POST(authedRequest({ ids: ['abc', -1, 1.5] }))
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ count: 0 })
        expect(calls.length).toBe(0)
    })
})
