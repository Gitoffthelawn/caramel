// scripts/check-coupons-schema.ts
//
// Dispatch-only drift check (F-001). The zod boundary in src/lib/couponsDb.ts
// catches shape/type drift at request time (throws loudly instead of
// serving malformed data), but that's reactive — it only fires once a real
// query runs. This script is the proactive half: it introspects
// information_schema.columns on the coupons DB (owned by the external
// Python verification service) and asserts every column this app's read
// queries depend on still exists, so a rename/drop is caught before it ever
// reaches a live request.
//
// No coupons DB is provisioned in CI (see scripts/ci-env.ts and every
// workflow under .github/workflows/ — COUPONS_DATABASE_URL never appears in
// a services: block). This only ever runs via `workflow_dispatch` against a
// real COUPONS_DATABASE_URL (see .github/workflows/coupons-schema-drift.yml).
//
// EXPECTED_COLUMNS is derived from the actual SQL in every coupons-DB read
// call site (SELECT projections + JOIN/WHERE key columns the queries
// themselves depend on to run at all) — see PLAN-F-001.md. Write-only
// columns (sources.created_at/updated_at, only touched by POST /api/sources)
// are deliberately excluded: out of scope for this read-boundary check.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

export const EXPECTED_COLUMNS: Record<string, string[]> = {
    coupons: [
        'id',
        'code',
        'site',
        'title',
        'description',
        'rating',
        'discount_type',
        'discount_amount',
        'expiry',
        'expired',
        'times_used',
        'status',
        'verification_message',
        'created_at',
    ],
    // websites is load-bearing: sources/route.ts's GET joins
    // `coupons c ON c.site = ANY(s.websites)` — the real relationship
    // (sources has no source_id/coupon-count columns of its own; coupons
    // has no source_id at all).
    sources: ['id', 'source', 'websites', 'status'],
    store_verification_configs: [
        'store_id',
        'show_input_xpath',
        'dismiss_button_xpath',
        'coupon_input_xpath',
        'apply_button_xpath',
        'price_container_xpath',
        'success_indicator_xpath',
        'error_indicator_xpath',
        'coupon_remove_xpath',
        'is_active',
        'metadata',
        'priority',
        'updated_at',
    ],
    verification_stores: ['id', 'store_name'],
}

/**
 * Returns `table.column` for every EXPECTED_COLUMNS entry missing from the
 * live database `sql` is connected to. Pure orchestration over a passed-in
 * client so it's testable with a mocked `sql` (see
 * tests/unit/check-coupons-schema.test.ts) without a live coupons DB.
 */
export async function findMissingColumns(
    sql: ReturnType<typeof postgres>,
): Promise<string[]> {
    const missing: string[] = []

    for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
        const rows = await sql<{ column_name: string }[]>`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ${table}
        `
        const present = new Set(rows.map(r => r.column_name))
        for (const column of columns) {
            if (!present.has(column)) missing.push(`${table}.${column}`)
        }
    }

    return missing
}

async function main() {
    const connectionString = process.env.COUPONS_DATABASE_URL
    if (!connectionString) {
        console.error(
            '[check-coupons-schema] COUPONS_DATABASE_URL is not set — cannot run the drift check. ' +
                'This script only runs via workflow_dispatch with the COUPONS_DATABASE_URL secret configured (see .github/workflows/coupons-schema-drift.yml).',
        )
        process.exit(1)
    }

    const sql = postgres(connectionString, { max: 1, prepare: false })
    let missing: string[] = []
    try {
        missing = await findMissingColumns(sql)
    } finally {
        await sql.end({ timeout: 5 })
    }

    if (missing.length > 0) {
        console.error(
            `[check-coupons-schema] SCHEMA DRIFT DETECTED — ${missing.length} column(s) missing or renamed:\n` +
                missing.map(c => `  - ${c}`).join('\n'),
        )
        process.exit(1)
    }

    const totalExpected = Object.values(EXPECTED_COLUMNS).flat().length
    const totalTables = Object.keys(EXPECTED_COLUMNS).length
    console.log(
        `[check-coupons-schema] OK — all ${totalExpected} expected columns present across ${totalTables} tables.`,
    )
}

const isDirectExecution =
    process.argv[1] &&
    path.resolve(process.argv[1]) ===
        path.resolve(fileURLToPath(import.meta.url))

if (isDirectExecution) {
    main().catch(err => {
        console.error('[check-coupons-schema] Unexpected failure:', err)
        process.exit(1)
    })
}
