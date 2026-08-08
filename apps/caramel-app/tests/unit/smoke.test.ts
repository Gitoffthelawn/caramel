import { describe, expect, it } from 'vitest'
import {
    assertCouponsOk,
    assertHealthOk,
    assertHomeOk,
} from '../../scripts/smoke'

// F-011 — pins the pure assertion helpers scripts/smoke.ts's post-deploy
// checks are built on. No network/live server involved (that half — the
// fetch* functions + the actual `pnpm smoke` run against a booted
// `next dev` — is exercised manually per PLAN-F-011.md §Test strategy, not
// by this unit suite). Each helper is tested both green (the real shape) and
// red (the specific ways a real outage would make it fail), matching the
// ACTUAL landed shapes: /api/health/db (F-001, src/app/api/health/db/
// route.ts) and /api/coupons (src/app/api/coupons/route.ts) — not guessed.

describe('assertHomeOk', () => {
    it('PASS: 200 + text/html content-type', () => {
        const result = assertHomeOk(200, 'text/html; charset=utf-8')
        expect(result.ok).toBe(true)
    })

    it('FAIL: non-200 status', () => {
        const result = assertHomeOk(503, 'text/html')
        expect(result.ok).toBe(false)
        expect(result.detail).toMatch(/503/)
    })

    it('FAIL: missing/wrong content-type (e.g. a JSON error page)', () => {
        const result = assertHomeOk(200, 'application/json')
        expect(result.ok).toBe(false)
        expect(result.detail).toMatch(/content-type/)
    })

    it('FAIL: null content-type header', () => {
        const result = assertHomeOk(200, null)
        expect(result.ok).toBe(false)
    })
})

describe('assertHealthOk', () => {
    it('PASS: 200, top-level status "ok", both checks "ok" (auth_db + catalog shape)', () => {
        const result = assertHealthOk(200, {
            status: 'ok',
            checks: {
                auth_db: { status: 'ok', service: 'auth_db', latencyMs: 5 },
                catalog: {
                    status: 'ok',
                    service: 'catalog',
                    latencyMs: 8,
                    details: {
                        count: 30,
                        freshestUpdatedAt: '2026-07-14T00:00:00.000Z',
                        ageMinutes: 120,
                        stale: false,
                    },
                },
            },
        })
        expect(result.ok).toBe(true)
    })

    it('FAIL: 503 with the catalog check down (unreachable or empty catalog)', () => {
        const result = assertHealthOk(503, {
            status: 'error',
            checks: {
                auth_db: { status: 'ok' },
                catalog: {
                    status: 'error',
                    details: 'relation "coupons" does not exist',
                },
            },
        })
        expect(result.ok).toBe(false)
        expect(result.detail).toMatch(/catalog=error/)
    })

    it('FAIL: 401 unauthorized (missing/wrong UPKUMA_HEALTH_SECRET) has no {status,checks} body', () => {
        const result = assertHealthOk(401, { error: 'Unauthorized' })
        expect(result.ok).toBe(false)
        expect(result.detail).toMatch(/401/)
    })

    it('FAIL: unparseable body (undefined — e.g. a non-JSON error page from a proxy)', () => {
        const result = assertHealthOk(502, undefined)
        expect(result.ok).toBe(false)
    })

    it('FAIL: both checks down', () => {
        const result = assertHealthOk(503, {
            status: 'error',
            checks: {
                auth_db: { status: 'error' },
                catalog: { status: 'error' },
            },
        })
        expect(result.ok).toBe(false)
        expect(result.detail).toMatch(/auth_db=error/)
        expect(result.detail).toMatch(/catalog=error/)
    })
})

describe('assertCouponsOk', () => {
    it('PASS: 200 + {coupons: [...]} with real rows', () => {
        const result = assertCouponsOk(200, {
            coupons: [{ id: '1', code: 'SAVE10' }],
            page: 1,
            limit: 10,
            total: 1,
            hasMore: false,
        })
        expect(result.ok).toBe(true)
    })

    it('PASS: 200 + an empty coupons array (no coupons for this site is not itself a failure)', () => {
        const result = assertCouponsOk(200, {
            coupons: [],
            page: 1,
            limit: 10,
            total: 0,
            hasMore: false,
        })
        expect(result.ok).toBe(true)
    })

    it('FAIL: 500 {error: "..."} (handleRouteError shape on a DB failure)', () => {
        const result = assertCouponsOk(500, {
            error: 'Error fetching coupons.',
        })
        expect(result.ok).toBe(false)
        expect(result.detail).toMatch(/500/)
    })

    it('FAIL: 200 but coupons is not an array (shape drift)', () => {
        const result = assertCouponsOk(200, { coupons: null })
        expect(result.ok).toBe(false)
    })
})
