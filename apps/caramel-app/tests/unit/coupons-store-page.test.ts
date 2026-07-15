import StoreCouponsPage from '@/app/(marketing)/coupons/[store]/page'
import { BASE_URL } from '@/lib/env.client'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// F-001 — (marketing)/coupons/[store]/page.tsx is the 9th read site: an SSR
// page (not a route handler), so it's exercised by calling the default
// export directly and inspecting the returned (unrendered) React element
// tree rather than rendering to a DOM. CouponsSection ('use client';
// framer-motion, next/image, ...) is mocked out so importing page.tsx doesn't
// drag that whole client-component tree into a plain `environment: 'node'`
// run.
//
// W4 — listStoreCoupons runs on the app's Prisma catalog via
// `prisma.$queryRaw(Prisma.sql`...`)`, so `@/lib/prisma` is mocked: `$queryRaw`
// is a rule-based resolver keyed on the composed `.sql`, and couponSignal is
// stubbed for attachSignals (no signals → lastWorkedAt:null).

type MockRule = { match: (sql: string) => boolean; rows: unknown[] }
let rules: MockRule[] = []
function mockRows(match: (sql: string) => boolean, rows: unknown[]) {
    rules.push({ match, rows })
}

vi.mock('@/lib/prisma', () => ({
    default: {
        $queryRaw: (arg: { sql: string }) => {
            const rows = rules.find(r => r.match(arg.sql))?.rows ?? []
            return Promise.resolve(rows)
        },
        couponSignal: { findMany: vi.fn(async () => []) },
    },
}))

vi.mock('@/components/coupons/coupons-section', () => ({
    default: () => null,
}))

beforeEach(() => {
    rules = []
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

describe('StoreCouponsPage — CouponListRow + TotalCountRow', () => {
    it('parses production-shaped rows into both the CouponsSection props and the structured-data script', async () => {
        mockRows(
            sql => sql.includes('FROM coupons') && sql.includes('LIMIT'),
            [couponFixture],
        )
        mockRows(sql => sql.includes('COUNT(*)::int AS total'), [{ total: 1 }])

        const mainEl = (await StoreCouponsPage({
            params: { store: 'example.com' },
        })) as ReactElement<{ children: ReactElement[] }>

        const children = mainEl.props.children
        const scriptEl = children.find(
            (
                c,
            ): c is ReactElement<{
                dangerouslySetInnerHTML: { __html: string }
            }> => (c as ReactElement)?.type === 'script',
        )
        const couponsSectionEl = children.find(
            c => (c as ReactElement)?.type !== 'script',
        ) as ReactElement<{
            initialCoupons: Array<Record<string, unknown>>
            initialTotal: number
        }>

        // Coercion proof: the numeric-string rating/discount_amount and the
        // int4-number id all normalized correctly, flowing all the way into
        // the props the client component receives.
        expect(couponsSectionEl.props.initialCoupons).toEqual([
            {
                ...couponFixture,
                id: '42',
                rating: 4.5,
                discount_amount: 10,
                // attachSignals merges this on; no seeded signal → null.
                lastWorkedAt: null,
            },
        ])
        expect(couponsSectionEl.props.initialTotal).toBe(1)

        // oxlint-disable-next-line no-underscore-dangle -- React's own prop name
        const structuredData = JSON.parse(
            scriptEl!.props.dangerouslySetInnerHTML.__html,
        )
        expect(structuredData.numberOfItems).toBe(1)
        // url is built from BASE_URL (env.client), which Vitest resolves from
        // the loaded .env locally (http://localhost:58000) but defaults to
        // https://grabcaramel.com in CI where no .env exists — assert against
        // the same resolved BASE_URL the page uses so the pin is env-agnostic.
        expect(structuredData.itemListElement).toEqual([
            {
                '@type': 'ListItem',
                position: 1,
                url: `${BASE_URL}/coupons/example.com`,
                name: couponFixture.title,
                description: couponFixture.description,
            },
        ])
    })

    it('an invalid store slug (fails getBaseDomain) short-circuits to zero coupons without ever querying the catalog', async () => {
        // No mockRows() rules registered — any $queryRaw call here would
        // return [] per the mock's fallback, but if the drift-detecting
        // parse actually ran on an empty page it wouldn't prove the
        // short-circuit; asserting rows stay empty and total is 0 for a
        // slug that fails getBaseDomain's hostname regex is the real proof.
        const mainEl = (await StoreCouponsPage({
            params: { store: '!!!not-a-domain!!!' },
        })) as ReactElement<{ children: ReactElement[] }>

        const couponsSectionEl = mainEl.props.children.find(
            c => (c as ReactElement)?.type !== 'script',
        ) as ReactElement<{ initialCoupons: unknown[]; initialTotal: number }>

        expect(couponsSectionEl.props.initialCoupons).toEqual([])
        expect(couponsSectionEl.props.initialTotal).toBe(0)
    })
})
