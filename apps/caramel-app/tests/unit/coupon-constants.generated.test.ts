import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderCouponConstants } from '../../scripts/generate-coupon-constants'

// F-006 (plan step 6) — the extension has no bundler and cannot `import`
// src/lib/coupons.ts, so its copy of the coupon status vocabulary is a
// COMMITTED generated file (apps/caramel-extension/coupon-constants.generated.js).
// This test is the drift guard: it regenerates the content IN-MEMORY (same
// pure renderCouponConstants() the codegen script calls) and diffs it
// against the committed bytes on disk. Red means someone edited
// src/lib/coupons.ts (or hand-edited the generated file) without running
// `pnpm generate:coupon-constants` — exactly the app<->extension drift
// F-006 exists to prevent.

const GENERATED_PATH = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../caramel-extension/coupon-constants.generated.js',
)

describe('coupon-constants.generated.js (F-006 app<->extension sync)', () => {
    it('the committed file is byte-identical to what renderCouponConstants() emits right now', () => {
        const committed = fs.readFileSync(GENERATED_PATH, 'utf8')
        expect(committed).toBe(renderCouponConstants())
    })

    it('sets window.CaramelCoupons with the 4 expected keys (sanity: the generator did not silently emit an empty/malformed payload)', () => {
        const rendered = renderCouponConstants()
        expect(rendered).toContain('window.CaramelCoupons = {')
        expect(rendered).toContain('"STATUSES"')
        expect(rendered).toContain('"VISIBLE_STATUSES"')
        expect(rendered).toContain('"RESTRICTED_STATUSES"')
        expect(rendered).toContain('"STATUS_META"')
    })
})
