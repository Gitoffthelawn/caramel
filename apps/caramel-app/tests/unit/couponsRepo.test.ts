import {
    expireCoupons,
    getCouponStats,
    incrementCouponUsage,
    listCoupons,
    requestSource,
} from '@/lib/couponsRepo'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Direct fn-level pins for couponsRepo.ts (coverage that doesn't route through
// an HTTP handler). Exhaustive query-shape/behavior pinning per route lives in
// coupons-read-boundary.test.ts, coupons-visibility.test.ts,
// coupons-store-page.test.ts, supported-stores.test.ts, and
// coupons-expire.test.ts — this file is deliberately NOT a duplicate of those.
//
// W4 split: the READS (listCoupons/getCouponStats) run on the app's Prisma
// catalog via `prisma.$queryRaw(Prisma.sql`...`)`, so they're driven through a
// mocked `@/lib/prisma` whose `$queryRaw` records the composed `.sql`
// (flattened `?`-placeholder text) and returns rule-matched rows. The WRITES
// (expire/increment/requestSource) still run on couponsDb.ts's porsager
// `couponsSql`, so that recording thenable mock stays. Both mocks share one
// rules/capturedQueries store (a given test exercises only one side).
type MockRule = { match: (sql: string) => boolean; rows: unknown[] }
let rules: MockRule[] = []
// Raw SQL text of every DB call, in order — lets a test assert on the
// generated QUERY SHAPE itself.
let capturedQueries: string[] = []
function mockRows(match: (sql: string) => boolean, rows: unknown[]) {
    rules.push({ match, rows })
}

// Reads: prisma.$queryRaw receives a Prisma.Sql whose `.sql` getter is the
// composed, flattened query text (nested fragments inlined, values as `?`).
vi.mock('@/lib/prisma', () => ({
    default: {
        $queryRaw: (arg: { sql: string }) => {
            capturedQueries.push(arg.sql)
            const rows = rules.find(r => r.match(arg.sql))?.rows ?? []
            return Promise.resolve(rows)
        },
        couponSignal: { findMany: vi.fn(async () => []) },
    },
}))

// Writes: couponsDb.ts's porsager couponsSql, a recording thenable.
// importActual keeps parseCouponRows + the real row schemas wired (the reads'
// zod parse imports them from this module too).
vi.mock('@/lib/couponsDb', async () => {
    const actual =
        await vi.importActual<typeof import('@/lib/couponsDb')>(
            '@/lib/couponsDb',
        )
    return {
        ...actual,
        couponsSql: (strings: TemplateStringsArray, ..._values: unknown[]) => {
            const sql = strings.join('?')
            capturedQueries.push(sql)
            const rows = rules.find(r => r.match(sql))?.rows ?? []
            return {
                // oxlint-disable-next-line no-thenable
                then: (resolve: (rows: unknown[]) => void) => resolve(rows),
            }
        },
    }
})

beforeEach(() => {
    rules = []
    capturedQueries = []
})

const couponFixture = {
    id: 42,
    code: 'SAVE10',
    site: 'example.com',
    title: 'Save 10% at Example',
    description: '10% off your order',
    rating: '4.5',
    discount_type: 'PERCENTAGE',
    discount_amount: '10',
    expiry: '2026-12-31',
    expired: false,
    timesUsed: 5,
    status: 'valid',
    verificationMessage: null,
}

describe('listCoupons', () => {
    it('parses a production-shaped fixture and derives total from the TotalCountRow', async () => {
        mockRows(
            sql => sql.includes('FROM coupons') && sql.includes('LIMIT'),
            [couponFixture],
        )
        mockRows(sql => sql.includes('COUNT(*)'), [{ total: 1 }])

        const result = await listCoupons({ limit: 10, skip: 0 })
        expect(result.coupons).toEqual([
            { ...couponFixture, id: '42', rating: 4.5, discount_amount: 10 },
        ])
        expect(result.total).toBe(1)
    })

    it('an empty total row falls back to 0 (no coupons is legitimate, not drift)', async () => {
        mockRows(
            sql => sql.includes('FROM coupons') && sql.includes('LIMIT'),
            [],
        )
        mockRows(sql => sql.includes('COUNT(*)'), [])

        const result = await listCoupons({ limit: 10, skip: 0 })
        expect(result).toEqual({ coupons: [], total: 0 })
    })
})

describe('listCoupons discount_type filter (case-insensitive)', () => {
    it('generates a casing-tolerant predicate so lowercase producer rows are not dropped', async () => {
        mockRows(
            sql => sql.includes('FROM coupons') && sql.includes('LIMIT'),
            [],
        )
        mockRows(sql => sql.includes('COUNT(*)'), [{ total: 0 }])

        await listCoupons({ type: 'PERCENTAGE', limit: 10, skip: 0 })

        // Target the discount_type PREDICATE fragment in the composed SQL —
        // matched by shape, not the bare column name, since the SELECT column
        // list also contains `discount_type`.
        const predicate = capturedQueries.find(q =>
            /discount_type\)?\s*=/i.test(q),
        )
        expect(predicate).toBeDefined()
        expect(predicate).toMatch(/UPPER\(discount_type\)\s*=\s*UPPER\(/i)
        // Guard against a regression to the bare, case-sensitive equality.
        expect(
            capturedQueries.some(q => /discount_type\s*=\s*\?/.test(q)),
        ).toBe(false)
    })

    it('adds no discount_type filter predicate when type is "all"', async () => {
        mockRows(
            sql => sql.includes('FROM coupons') && sql.includes('LIMIT'),
            [],
        )
        mockRows(sql => sql.includes('COUNT(*)'), [{ total: 0 }])

        await listCoupons({ type: 'all', limit: 10, skip: 0 })

        // The SELECT column list names `discount_type`, so assert on the
        // PREDICATE shape (a `discount_type =` comparison), not the column.
        const hasTypePredicate = capturedQueries.some(
            q =>
                /UPPER\(discount_type\)\s*=/i.test(q) ||
                /discount_type\s*=\s*\?/.test(q),
        )
        expect(hasTypePredicate).toBe(false)
    })
})

describe('getCouponStats', () => {
    it('falls back to {total:0,expired:0} when the aggregate returns no row (the fallback moved here from the route)', async () => {
        mockRows(sql => sql.includes('COUNT(*) FILTER'), [])

        const stats = await getCouponStats()
        expect(stats).toEqual({ total: 0, expired: 0 })
    })

    it('returns the parsed aggregate row as-is when present', async () => {
        mockRows(
            sql => sql.includes('COUNT(*) FILTER'),
            [{ total: 10, expired: 3 }],
        )

        const stats = await getCouponStats()
        expect(stats).toEqual({ total: 10, expired: 3 })
    })
})

describe('expireCoupons (write)', () => {
    it('returns rows.length from the UPDATE...RETURNING id', async () => {
        mockRows(
            sql =>
                sql.includes('UPDATE coupons') &&
                sql.includes('expired = TRUE'),
            [{ id: 1 }, { id: 2 }],
        )

        await expect(expireCoupons([1, 2])).resolves.toBe(2)
    })

    it('returns 0 when no row matched', async () => {
        mockRows(
            sql =>
                sql.includes('UPDATE coupons') &&
                sql.includes('expired = TRUE'),
            [],
        )

        await expect(expireCoupons([999999])).resolves.toBe(0)
    })
})

describe('incrementCouponUsage (write)', () => {
    it('returns rows[0] (untyped passthrough, no zod) when a row matched', async () => {
        const row = {
            id: '42',
            code: 'SAVE10',
            site: 'example.com',
            timesUsed: 6,
        }
        mockRows(sql => sql.includes('times_used = times_used + 1'), [row])

        await expect(incrementCouponUsage(42)).resolves.toEqual(row)
    })

    it('returns undefined when no coupon matched the id', async () => {
        mockRows(sql => sql.includes('times_used = times_used + 1'), [])

        await expect(incrementCouponUsage(999999)).resolves.toBeUndefined()
    })
})

describe('requestSource (write)', () => {
    it('issues the sources INSERT and resolves void', async () => {
        mockRows(sql => sql.includes('INSERT INTO sources'), [])

        await expect(requestSource('example.com')).resolves.toBeUndefined()
    })
})
