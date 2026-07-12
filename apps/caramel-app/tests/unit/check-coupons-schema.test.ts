import { describe, expect, it } from 'vitest'
import {
    EXPECTED_COLUMNS,
    findMissingColumns,
} from '../../scripts/check-coupons-schema'

// F-001 — findMissingColumns is the pure core of the dispatch-only drift
// script (scripts/check-coupons-schema.ts): given a `sql` client, it
// queries information_schema.columns per table and reports any
// EXPECTED_COLUMNS entry that's absent. Mocked here (no live coupons DB
// available locally or in CI — see PLAN-F-001.md's §Risk) so the missing-
// column detection logic itself is proven correct independent of a real
// database. A live-boot sanity check (pointing this script's connection
// string at the local AUTH db, which genuinely lacks every coupons/sources/
// verification_* table) is documented in the F-001 executor report as the
// empirical proof that the exit-1 path fires for real.

type ColumnsByTable = Record<string, string[]>

function makeMockSql(columnsByTable: ColumnsByTable) {
    const fn = (_strings: TemplateStringsArray, ...values: unknown[]) => {
        const table = values[0] as string
        const columns = columnsByTable[table] ?? []
        return Promise.resolve(columns.map(column_name => ({ column_name })))
    }
    return fn as unknown as Parameters<typeof findMissingColumns>[0]
}

describe('findMissingColumns', () => {
    it('returns [] when every EXPECTED_COLUMNS entry is present in every table', async () => {
        const sql = makeMockSql(EXPECTED_COLUMNS)
        expect(await findMissingColumns(sql)).toEqual([])
    })

    it('reports a single missing column as "table.column"', async () => {
        const columnsByTable: ColumnsByTable = Object.fromEntries(
            Object.entries(EXPECTED_COLUMNS).map(([table, cols]) => [
                table,
                table === 'coupons' ? cols.filter(c => c !== 'status') : cols,
            ]),
        )
        const sql = makeMockSql(columnsByTable)
        expect(await findMissingColumns(sql)).toEqual(['coupons.status'])
    })

    it('reports every expected column for a table that returns none at all (e.g. the table itself was renamed)', async () => {
        const columnsByTable: ColumnsByTable = {
            ...EXPECTED_COLUMNS,
            sources: [],
        }
        const sql = makeMockSql(columnsByTable)
        const missing = await findMissingColumns(sql)
        for (const column of EXPECTED_COLUMNS.sources) {
            expect(missing).toContain(`sources.${column}`)
        }
    })

    it('accumulates missing columns across multiple tables', async () => {
        const columnsByTable: ColumnsByTable = Object.fromEntries(
            Object.entries(EXPECTED_COLUMNS).map(([table, cols]) => {
                if (table === 'coupons')
                    return [table, cols.filter(c => c !== 'discount_type')]
                if (table === 'verification_stores')
                    return [table, cols.filter(c => c !== 'store_name')]
                return [table, cols]
            }),
        )
        const sql = makeMockSql(columnsByTable)
        expect(await findMissingColumns(sql)).toEqual([
            'coupons.discount_type',
            'verification_stores.store_name',
        ])
    })

    it('tolerates extra, unexpected columns in the live table without reporting them (this check only asserts presence, not exhaustiveness)', async () => {
        const columnsByTable: ColumnsByTable = {
            ...EXPECTED_COLUMNS,
            coupons: [...EXPECTED_COLUMNS.coupons, 'some_new_producer_column'],
        }
        const sql = makeMockSql(columnsByTable)
        expect(await findMissingColumns(sql)).toEqual([])
    })
})
