import {
    expireCoupons,
    getCouponStats,
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
// W4-D2: reads AND writes now run on the app's own Prisma catalog, so a single
// mocked `@/lib/prisma` covers both. `$queryRaw` (reads) records the composed
// `.sql` (flattened `?`-placeholder text) and returns rule-matched rows;
// `$executeRaw` (expire) records its `.sql` and returns a preset affected-row
// count; `source.create` (requestSource) records its args. parseCouponRows +
// the real row schemas come from the UNMOCKED couponsDb (the reads' zod parse).
type MockRule = { match: (sql: string) => boolean; rows: unknown[] }
let rules: MockRule[] = []
// Raw SQL text of every DB call, in order — lets a test assert on the
// generated QUERY SHAPE itself.
let capturedQueries: string[] = []
// Affected-row count the mocked $executeRaw returns (expire).
let executeRawResult = 0
// Args every prisma.source.create() was called with (requestSource).
let capturedSourceCreates: unknown[] = []
function mockRows(match: (sql: string) => boolean, rows: unknown[]) {
    rules.push({ match, rows })
}

// prisma.$queryRaw / $executeRaw receive a Prisma.Sql whose `.sql` getter is the
// composed, flattened query text (nested fragments inlined, values as `?`).
vi.mock('@/lib/prisma', () => ({
    default: {
        $queryRaw: (arg: { sql: string }) => {
            capturedQueries.push(arg.sql)
            const rows = rules.find(r => r.match(arg.sql))?.rows ?? []
            return Promise.resolve(rows)
        },
        $executeRaw: (arg: { sql: string }) => {
            capturedQueries.push(arg.sql)
            return Promise.resolve(executeRawResult)
        },
        couponSignal: { findMany: vi.fn(async () => []) },
        source: {
            create: (arg: unknown) => {
                capturedSourceCreates.push(arg)
                return Promise.resolve({})
            },
        },
    },
}))

beforeEach(() => {
    rules = []
    capturedQueries = []
    executeRawResult = 0
    capturedSourceCreates = []
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

describe('expireCoupons (write, app catalog via prisma.$executeRaw)', () => {
    it('UPDATEs the app coupons table and returns the affected-row count directly', async () => {
        executeRawResult = 2

        await expect(expireCoupons(['1', '2'])).resolves.toBe(2)

        // The intent SQL — an UPDATE flipping expired=TRUE on the app catalog,
        // guarded to only-currently-live rows (so the count = FALSE→TRUE
        // transitions), on our OWN table via prisma.$executeRaw (never an
        // external coupons DB).
        expect(capturedQueries).toHaveLength(1)
        expect(capturedQueries[0]).toContain('UPDATE coupons')
        expect(capturedQueries[0]).toContain('expired = TRUE')
        expect(capturedQueries[0]).toContain('expired = FALSE')
    })

    it('returns 0 when no live row matched (executeRaw affected 0)', async () => {
        executeRawResult = 0

        await expect(expireCoupons(['999999'])).resolves.toBe(0)
        expect(capturedQueries).toHaveLength(1)
    })

    it('short-circuits an empty id list to 0 WITHOUT issuing SQL (IN () is invalid)', async () => {
        await expect(expireCoupons([])).resolves.toBe(0)
        expect(capturedQueries).toHaveLength(0)
    })
})

describe('requestSource (write, app sources INSERT via prisma.source.create)', () => {
    it('creates a REQUESTED source row (empty websites[], minted id) and resolves void', async () => {
        await expect(requestSource('example.com')).resolves.toBeUndefined()

        expect(capturedSourceCreates).toHaveLength(1)
        const arg = capturedSourceCreates[0] as {
            data: {
                id: string
                source: string
                websites: string[]
                status: string
            }
        }
        expect(arg.data.source).toBe('example.com')
        expect(arg.data.websites).toEqual([])
        expect(arg.data.status).toBe('REQUESTED')
        // id is minted app-side (Source.id has no DB default) — a non-empty string.
        expect(typeof arg.data.id).toBe('string')
        expect(arg.data.id.length).toBeGreaterThan(0)
    })
})
