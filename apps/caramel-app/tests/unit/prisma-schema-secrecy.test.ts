import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Secrecy forward-rule (DESIGN.md §2(k), CLAUDE.md "No coupons/sources/
// verification_* schema in prisma/schema.prisma, ever") — turns a
// memory-only rule into a build check (CLAUDE.md's own "TODO: a CI grep
// gate"). The sensitive caramel_coupons schema (coupon rows, source lists,
// the scraper's verification_* tables + xpath selectors) is owned by the
// external Python service and must NEVER be named in prisma/schema.prisma,
// which models ONLY the auth/user Postgres. This gate parses schema.prisma
// and fails if any model/enum name, @@map, or @map names a banned
// coupons-DB family: /^(Coupon|Source|Verification)/i, or a table/column
// named `coupons` / `sources` / `verification_*`.
//
// Scope is schema.prisma ALONE. The historical Coupon/Source table residual
// under prisma/migrations/ is CTO-accepted (DESIGN.md §3 "Historical
// residual") and deliberately NOT scanned — rewriting committed migration
// history is a bigger risk than the residual.
//
// Two legitimate members of the banned families are allowlisted, each an
// app-owned entity that is NOT the external coupons catalog:
//   - better-auth's `Verification` model mapped to `verification_tokens` —
//     auth email-verification tokens, NOT the coupons-DB verification schema
//     §2(k) protects. Keyed by BOTH its model name and its mapped table.
//   - `CouponSignal` (W1) — app-owned "did this coupon work?" trust telemetry
//     in OUR Postgres, mapped `coupon_signals` (NOT `coupons`). It reuses the
//     Coupon* prefix but stores none of the external catalog's data, so it is
//     allowlisted by MODEL NAME only. The allowlist stays surgical: any OTHER
//     Coupon*/Verification*/Source* entity, or a `@@map("coupons")`/`sources`/
//     `verification_*` target, is still a real coupons-DB leak and still fails.

const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..',
)
const SCHEMA_PATH = path.join(
    REPO_ROOT,
    'apps/caramel-app/prisma/schema.prisma',
)

const BANNED_NAME_RE = /^(Coupon|Source|Verification)/i

// Exact app-owned entities that share a banned family prefix but are NOT the
// external coupons schema — the ONLY permitted members of the banned families
// (better-auth's Verification, and W1's app-owned CouponSignal telemetry).
const ALLOWLISTED_MODEL_NAMES = new Set(['Verification', 'CouponSignal'])
const ALLOWLISTED_MAP_TARGETS = new Set(['verification_tokens'])

function isBannedMapTarget(target: string): boolean {
    return (
        target === 'coupons' ||
        target === 'sources' ||
        target.startsWith('verification_')
    )
}

interface SchemaViolation {
    kind: 'model' | 'enum' | 'map'
    name: string
}

// Pure detector over Prisma DSL text: model/enum declarations plus every
// @@map("table") / @map("column") target. Exported shape kept local (no
// export) — used only by this gate + its own red-proof below.
function findBannedSchemaEntities(schema: string): SchemaViolation[] {
    const violations: SchemaViolation[] = []

    const declRe = /^\s*(model|enum)\s+(\w+)\s*\{/gm
    for (const match of Array.from(schema.matchAll(declRe))) {
        const kind = match[1] as 'model' | 'enum'
        const name = match[2]!
        if (BANNED_NAME_RE.test(name) && !ALLOWLISTED_MODEL_NAMES.has(name)) {
            violations.push({ kind, name })
        }
    }

    const mapRe = /@@?map\(\s*["']([^"']+)["']\s*\)/g
    for (const match of Array.from(schema.matchAll(mapRe))) {
        const target = match[1]!
        if (isBannedMapTarget(target) && !ALLOWLISTED_MAP_TARGETS.has(target)) {
            violations.push({ kind: 'map', name: target })
        }
    }

    return violations
}

describe('prisma-schema-secrecy (DESIGN §2(k) forward-rule)', () => {
    it('schema.prisma names no coupons-DB model/enum/table family', () => {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
        expect(findBannedSchemaEntities(schema)).toEqual([])
    })

    it('allowlists better-auth Verification → verification_tokens by MATCHING it, not by its absence', () => {
        // Sanity that the file actually contains the one allowlisted family
        // member — so the green result above is the allowlist doing its job,
        // not the file simply lacking any Verification entity (which would
        // let the allowlist rot silently).
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
        expect(schema).toMatch(/\bmodel\s+Verification\b/)
        expect(schema).toMatch(/@@map\("verification_tokens"\)/)
    })

    it('allowlists app-owned CouponSignal by MATCHING it, while a rogue catalog Coupon model is STILL caught (surgical, not a hole)', () => {
        // Same "match, not absence" guard for the W1 telemetry model: the
        // schema really contains CouponSignal → coupon_signals, so the green
        // result above is the allowlist working, not the model missing.
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
        expect(schema).toMatch(/\bmodel\s+CouponSignal\b/)
        expect(schema).toMatch(/@@map\("coupon_signals"\)/)

        // The allowlist exempts EXACTLY `CouponSignal`, nothing broader: a
        // rogue model reusing the Coupon* prefix and mapping the real
        // `coupons` catalog table is still flagged as a leak.
        const rogue = [
            'model Coupon {',
            '  id String @id',
            '  @@map("coupons")',
            '}',
        ].join('\n')
        const rogueNames = findBannedSchemaEntities(rogue)
            .map(v => v.name)
            .sort()
        expect(rogueNames).toEqual(['Coupon', 'coupons'].sort())
    })

    it('the gate itself catches a coupons-DB schema leak (red-proof)', () => {
        const leak = [
            'model Coupon {',
            '  id String @id',
            '  @@map("coupons")',
            '}',
            'model SourceRequest {',
            '  id String @id',
            '  @@map("sources")',
            '}',
            'model VerificationRun {',
            '  id String @id',
            '  @@map("verification_runs")',
            '}',
            'enum DiscountType { PERCENT FIXED }',
        ].join('\n')

        const names = findBannedSchemaEntities(leak)
            .map(v => v.name)
            .sort()
        expect(names).toEqual(
            [
                'Coupon',
                'SourceRequest',
                'VerificationRun',
                'coupons',
                'sources',
                'verification_runs',
            ].sort(),
        )
    })

    it('does NOT flag the legitimate auth models', () => {
        const authSchema = [
            'model Account { id String @id @@map("accounts") }',
            'model Session { id String @id @@map("sessions") }',
            'model Verification { id String @id @@map("verification_tokens") }',
            'model User { id String @id @@map("users") }',
            'enum Role { USER ADMIN }',
            'enum UserStatus { ACTIVE_USER NOT_VERIFIED }',
        ].join('\n')
        expect(findBannedSchemaEntities(authSchema)).toEqual([])
    })
})
