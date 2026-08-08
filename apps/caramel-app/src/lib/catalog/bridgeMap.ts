// src/lib/catalog/bridgeMap.ts
//
// W4-D4 — PURE mappers for the coupons BRIDGE SYNC. They turn rows READ from the
// still-live external, Python-owned `caramel_coupons` Postgres into the app's
// INGEST payload, which scripts/bridge-sync.ts then replays through the SAME
// applyCatalogRows() engine POST /api/ingest/catalog uses. This is the
// MIGRATION-PERIOD FEED: the temporary path that keeps the app's own published
// catalog fresh until the external Python pipeline is switched to push directly
// (a later workstream).
//
// NO IO here — no `postgres`, no `prisma`, no `@/lib/env`. Just the external row
// shapes + a mapper, so the mapping is unit-testable without a database and the
// integration test proves it end-to-end against real pg.
//
// READ-ONLY DISCIPLINE: the external DB is only ever SELECTed (in bridge-sync.ts).
// Nothing in the bridge writes back to it; these mappers merely reshape rows that
// were already read.
//
// ONLY-IF-NEWER ORDERING KEY (assumed present — fails LOUD if not): applyCatalogRows
// applies each row only when it is at least as new as the stored row, keyed on
// `updated_at`. So the external `coupons.updated_at` column AND the store config's
// `cfg.updated_at` column are REQUIRED — the bridge's SELECTs project them
// explicitly. If either column is ever renamed/dropped upstream, the SELECT itself
// throws on the first real run (a missing column is a hard SQL error): that is the
// INTENDED fail-loud, NOT something to paper over — flagged here for the human.
// Coupon `updated_at` is mandatory in IngestCouponSchema too, so a coupon row that
// somehow arrives without it is rejected at parse time below, never defaulted.
//
// The External*Row interfaces are faithful to what the porsager `postgres` driver
// returns for the bridge's exact SELECT projections: Date for the timestamptz
// columns, number for the numeric/int columns, string[] for text[], string|null
// for nullable text. int8 `coupons.id` comes back as a STRING under porsager (kept
// as string here; the ingest id schema accepts string|number either way). If a
// numeric column is actually `numeric` rather than float8/int upstream, porsager
// returns it as a string at runtime — IngestCouponSchema's z.coerce.number() still
// produces the correct value, so the payload is right regardless (noted for the
// human as the one runtime-vs-declared-type caveat).
import {
    IngestCatalogPayloadSchema,
    type IngestCatalogPayload,
} from '@/lib/catalog/ingestSchemas'

/** One row of the bridge's `coupons` SELECT (all 16 columns, verbatim order). */
export interface ExternalCouponRow {
    id: string
    code: string
    site: string | null
    title: string
    description: string
    rating: number
    discount_type: string | null
    discount_amount: number | null
    expiry: string | null
    expired: boolean
    times_used: number
    last_time_used: Date | null
    status: string
    verification_message: string | null
    updated_at: Date
    created_at: Date
}

/** One row of the bridge's store-config SELECT — the DISTINCT ON "one best
 * active + extension-compatible config per store" projection: store_name + the 8
 * xpaths + the config's own `updated_at` (carried for only-if-newer). */
export interface ExternalStoreConfigRow {
    store_name: string
    show_input_xpath: string | null
    dismiss_button_xpath: string | null
    coupon_input_xpath: string | null
    apply_button_xpath: string | null
    price_container_xpath: string | null
    success_indicator_xpath: string | null
    error_indicator_xpath: string | null
    coupon_remove_xpath: string | null
    updated_at: Date
}

/** One row of the bridge's `sources` SELECT (the STORED columns only — the
 * read-time per-source aggregates are computed by a JOIN, never stored). */
export interface ExternalSourceRow {
    id: string
    source: string
    websites: string[]
    status: string
    updated_at: Date
    created_at: Date
}

/**
 * Assemble external catalog rows into a validated INGEST payload for
 * applyCatalogRows(). Each raw row becomes its snake_case ingest object
 * (near-identity — the external column names already match the ingest wire keys),
 * then the whole thing is run through IngestCatalogPayloadSchema.parse() so every
 * coercion / default / refine applies exactly as it does for the trusted-supplier
 * push — including the loud reject of a fully-empty payload. A malformed row (a
 * non-numeric id, or a coupon missing its `updated_at` ordering key) throws
 * LOUDLY here rather than reaching the DB.
 */
export function buildIngestPayload(
    rows: {
        coupons: ExternalCouponRow[]
        storeConfigs: ExternalStoreConfigRow[]
        sources: ExternalSourceRow[]
    },
    opts?: { force?: boolean },
): IngestCatalogPayload {
    const coupons = rows.coupons.map(row => ({
        id: row.id,
        code: row.code,
        site: row.site,
        title: row.title,
        description: row.description,
        rating: row.rating,
        discount_type: row.discount_type,
        discount_amount: row.discount_amount,
        expiry: row.expiry,
        expired: row.expired,
        times_used: row.times_used,
        last_time_used: row.last_time_used,
        status: row.status,
        verification_message: row.verification_message,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }))

    const storeConfigs = rows.storeConfigs.map(row => ({
        store_name: row.store_name,
        show_input_xpath: row.show_input_xpath,
        dismiss_button_xpath: row.dismiss_button_xpath,
        coupon_input_xpath: row.coupon_input_xpath,
        apply_button_xpath: row.apply_button_xpath,
        price_container_xpath: row.price_container_xpath,
        success_indicator_xpath: row.success_indicator_xpath,
        error_indicator_xpath: row.error_indicator_xpath,
        coupon_remove_xpath: row.coupon_remove_xpath,
        updated_at: row.updated_at,
    }))

    const sources = rows.sources.map(row => ({
        id: row.id,
        source: row.source,
        websites: row.websites,
        status: row.status,
        updated_at: row.updated_at,
        created_at: row.created_at,
    }))

    return IngestCatalogPayloadSchema.parse({
        coupons,
        storeConfigs,
        sources,
        force: opts?.force ?? false,
    })
}
