// scripts/generate-coupon-constants.ts
//
// Codegen (F-006). The extension has no bundler — manifest.json's
// content_scripts and index.html load plain classic <script> files, so it
// cannot `import` src/lib/coupons.ts directly (no npm workspace resolution,
// no import/export in a MV3 content-script realm). This script renders that
// module's status vocabulary into a plain classic-script file the extension
// DOES load, establishing `window.CaramelCoupons` the same way
// cart-signals.js already establishes `window.CaramelCartSignals` for
// cross-file sharing within the extension.
//
// apps/caramel-extension/coupon-constants.generated.js is COMMITTED, not
// gitignored or produced at install/deploy time — the extension's own
// "build" is an rsync copy (see its package.json `build` script), not a
// bundler, so there is no build-time hook to run this against automatically.
// Regenerate after any src/lib/coupons.ts change:
//   pnpm --filter caramel-landing generate:coupon-constants
// tests/unit/coupon-constants.generated.test.ts fails the moment the
// committed file drifts from what this script would currently emit.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    COUPON_STATUSES,
    RESTRICTED_COUPON_STATUSES,
    STATUS_META,
    VISIBLE_COUPON_STATUSES,
} from '../src/lib/coupons'

/** Pure render — no filesystem access — so it's directly testable (regenerate in-memory, diff against the committed bytes). */
export function renderCouponConstants(): string {
    const payload = {
        STATUSES: [...COUPON_STATUSES],
        VISIBLE_STATUSES: [...VISIBLE_COUPON_STATUSES],
        RESTRICTED_STATUSES: [...RESTRICTED_COUPON_STATUSES],
        STATUS_META,
    }

    return `// GENERATED FILE — DO NOT EDIT BY HAND.
// Source: apps/caramel-app/src/lib/coupons.ts
// Regenerate: pnpm --filter caramel-landing generate:coupon-constants
// (apps/caramel-app/scripts/generate-coupon-constants.ts)
//
// Sets window.CaramelCoupons — the coupon status vocabulary shared with the
// app (F-006), so the extension can never re-drift its own hard-coded copy
// of it. Classic script (no import/export): loaded before shared-utils.js
// and popup.js — see manifest.json, manifest-firefox.json, and index.html.
window.CaramelCoupons = ${JSON.stringify(payload, null, 4)}
`
}

const OUTPUT_PATH = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../caramel-extension/coupon-constants.generated.js',
)

function main() {
    fs.writeFileSync(OUTPUT_PATH, renderCouponConstants(), 'utf8')
    console.log(
        `[generate-coupon-constants] wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`,
    )
}

const isDirectExecution =
    process.argv[1] &&
    path.resolve(process.argv[1]) ===
        path.resolve(fileURLToPath(import.meta.url))

if (isDirectExecution) {
    main()
}
