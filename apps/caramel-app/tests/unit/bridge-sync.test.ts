import {
    buildIngestPayload,
    type ExternalCouponRow,
    type ExternalSourceRow,
    type ExternalStoreConfigRow,
} from '@/lib/catalog/bridgeMap'
import { describe, expect, it } from 'vitest'

// W4-D4 unit — buildIngestPayload maps external caramel_coupons rows into the
// applyCatalogRows() ingest payload. ALL rows here are SYNTHETIC (loudly
// labelled; a private 7700000xx coupon-id range that cannot collide with the
// seed or any itest). No DB: this pins the pure mapping + coercion + the loud
// rejects; tests/integration/bridge-sync.itest.ts then proves the same path
// end-to-end against real pg.

// A fully-valid SYNTHETIC external coupon row — what porsager returns for the
// bridge's coupons SELECT (Date timestamps, number rating/amount/count, int8 id
// as a string).
function externalCoupon(
    over: Partial<ExternalCouponRow> = {},
): ExternalCouponRow {
    return {
        id: '770000001',
        code: 'SYNTHETIC-10',
        site: 'synthetic-store.example',
        title: 'SYNTHETIC 10% off',
        description: 'SYNTHETIC bridge unit-test coupon',
        rating: 4.5,
        discount_type: 'percentage',
        discount_amount: 10,
        expiry: '2027-01-01',
        expired: false,
        times_used: 7,
        last_time_used: new Date('2026-07-10T00:00:00.000Z'),
        status: 'valid',
        verification_message: 'SYNTHETIC verified',
        updated_at: new Date('2026-07-11T00:00:00.000Z'),
        created_at: new Date('2026-07-01T00:00:00.000Z'),
        ...over,
    }
}

function externalStoreConfig(
    over: Partial<ExternalStoreConfigRow> = {},
): ExternalStoreConfigRow {
    return {
        store_name: 'synthetic-store.example',
        show_input_xpath: '//button[@id="show"]',
        dismiss_button_xpath: null,
        coupon_input_xpath: '//input[@id="code"]',
        apply_button_xpath: '//button[@id="apply"]',
        price_container_xpath: '//div[@id="total"]',
        success_indicator_xpath: null,
        error_indicator_xpath: null,
        coupon_remove_xpath: null,
        updated_at: new Date('2026-07-11T00:00:00.000Z'),
        ...over,
    }
}

function externalSource(
    over: Partial<ExternalSourceRow> = {},
): ExternalSourceRow {
    return {
        id: 'synthetic-source-7700',
        source: 'SYNTHETIC Bridge Feed',
        websites: ['synthetic-store.example', 'other-synthetic.example'],
        status: 'ACTIVE',
        updated_at: new Date('2026-07-11T00:00:00.000Z'),
        created_at: new Date('2026-07-01T00:00:00.000Z'),
        ...over,
    }
}

describe('buildIngestPayload — external rows map into the ingest payload', () => {
    it('maps a coupon row 1:1 (snake_case keys, numeric types preserved, updated_at as Date)', () => {
        const payload = buildIngestPayload({
            coupons: [externalCoupon()],
            storeConfigs: [],
            sources: [],
        })

        expect(payload.coupons).toHaveLength(1)
        const c = payload.coupons[0]!
        expect(c.id).toBe('770000001')
        expect(c.code).toBe('SYNTHETIC-10')
        expect(c.site).toBe('synthetic-store.example')
        expect(c.rating).toBe(4.5)
        expect(typeof c.rating).toBe('number')
        expect(c.discount_amount).toBe(10)
        expect(typeof c.discount_amount).toBe('number')
        expect(c.times_used).toBe(7)
        expect(typeof c.times_used).toBe('number')
        // discount_type/status stored RAW — NOT normalized at ingest time.
        expect(c.discount_type).toBe('percentage')
        expect(c.status).toBe('valid')
        expect(c.expiry).toBe('2027-01-01')
        // updated_at is the only-if-newer key — carried through as a Date.
        expect(c.updated_at).toBeInstanceOf(Date)
        expect(c.updated_at.getTime()).toBe(
            new Date('2026-07-11T00:00:00.000Z').getTime(),
        )
        expect(c.last_time_used).toBeInstanceOf(Date)
    })

    it('coerces a coupon id supplied as a number to its string form', () => {
        // int8 ids normally arrive as strings under porsager, but the ingest id
        // schema accepts string|number → string; prove the number path coerces.
        const payload = buildIngestPayload({
            coupons: [externalCoupon({ id: 770000042 as unknown as string })],
            storeConfigs: [],
            sources: [],
        })
        expect(payload.coupons[0]!.id).toBe('770000042')
    })

    it('flattens a store config (store_name + the 8 xpaths + updated_at), nulls preserved', () => {
        const payload = buildIngestPayload({
            coupons: [],
            storeConfigs: [externalStoreConfig()],
            sources: [],
        })

        expect(payload.storeConfigs).toHaveLength(1)
        const s = payload.storeConfigs[0]!
        expect(s.store_name).toBe('synthetic-store.example')
        expect(s.coupon_input_xpath).toBe('//input[@id="code"]')
        expect(s.apply_button_xpath).toBe('//button[@id="apply"]')
        expect(s.show_input_xpath).toBe('//button[@id="show"]')
        expect(s.dismiss_button_xpath).toBeNull()
        expect(s.coupon_remove_xpath).toBeNull()
        expect(s.updated_at).toBeInstanceOf(Date)
    })

    it('maps a source row (websites[] carried through, updated_at as Date)', () => {
        const payload = buildIngestPayload({
            coupons: [],
            storeConfigs: [],
            sources: [externalSource()],
        })

        expect(payload.sources).toHaveLength(1)
        const src = payload.sources[0]!
        expect(src.id).toBe('synthetic-source-7700')
        expect(src.source).toBe('SYNTHETIC Bridge Feed')
        expect(src.websites).toEqual([
            'synthetic-store.example',
            'other-synthetic.example',
        ])
        expect(src.status).toBe('ACTIVE')
        expect(src.updated_at).toBeInstanceOf(Date)
    })

    it('defaults force to false and passes force=true through', () => {
        expect(
            buildIngestPayload({
                coupons: [externalCoupon()],
                storeConfigs: [],
                sources: [],
            }).force,
        ).toBe(false)
        expect(
            buildIngestPayload(
                { coupons: [externalCoupon()], storeConfigs: [], sources: [] },
                { force: true },
            ).force,
        ).toBe(true)
    })
})

describe('buildIngestPayload — loud rejects (no silent bad data)', () => {
    it('throws on a non-numeric coupon id', () => {
        expect(() =>
            buildIngestPayload({
                coupons: [externalCoupon({ id: 'abc' })],
                storeConfigs: [],
                sources: [],
            }),
        ).toThrow()
    })

    it('throws on a coupon missing its updated_at ordering key', () => {
        // SYNTHETIC — the external coupons SELECT returned a row with NO
        // updated_at (e.g. the column was renamed/dropped upstream). updated_at
        // is the REQUIRED only-if-newer key, so the mapper must throw LOUDLY
        // rather than default-and-clobber. Built as a literal minus updated_at,
        // cast past the type to model what the driver would actually hand back.
        const rowWithoutUpdatedAt = {
            id: '770000009',
            code: 'SYNTHETIC-NO-TS',
            site: 'synthetic-store.example',
            title: 'SYNTHETIC no-timestamp',
            description: 'SYNTHETIC bridge coupon with no updated_at',
            rating: 0,
            discount_type: null,
            discount_amount: null,
            expiry: null,
            expired: false,
            times_used: 0,
            last_time_used: null,
            status: 'valid',
            verification_message: null,
            created_at: new Date('2026-07-01T00:00:00.000Z'),
            // updated_at intentionally omitted
        } as unknown as ExternalCouponRow

        expect(() =>
            buildIngestPayload({
                coupons: [rowWithoutUpdatedAt],
                storeConfigs: [],
                sources: [],
            }),
        ).toThrow()
    })

    it('throws on a fully-empty payload (the refine — an empty sync is a producer bug, not a no-op)', () => {
        expect(() =>
            buildIngestPayload({ coupons: [], storeConfigs: [], sources: [] }),
        ).toThrow()
    })
})
