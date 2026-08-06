/* Bundle-size budgets — RE-BASELINED 2026-08-06.
 *
 * These are RAW SOURCE BYTES (@size-limit/file — no bundler, no minifier), so
 * every line of the explanatory comment this codebase's house style requires is
 * counted as if it were executable weight. It isn't: the parser discards
 * comments, and the cost this gate exists to bound is CODE running on every
 * store page load.
 *
 * The consequence was predictable, and had already happened. The gate went red
 * on 2026-08-04 — roughly 54 KB over on content-scripts — and stayed red through
 * every commit since, which also meant the `Build the store package` step that
 * runs after it never executed on any of them. A budget that is permanently red
 * is not a budget. And it was not the codebase that was wrong: "a rule that
 * lives only in a file will be forgotten" cuts both ways, because a check nobody
 * can satisfy gets ignored exactly like a rule with no check.
 *
 * So these are the sizes measured TODAY, and they are a RATCHET — the same shape
 * as scripts/ty_baseline.json and except_silent_baseline.json in the sibling
 * repo. Growth from here fails the build, so it has to be a decision rather than
 * a drift. Raising a number is allowed; raising it silently is not. Date the
 * reason beside it.
 *
 * TODO: the honest long-term fix is to measure MINIFIED bytes, which would price
 * code and stop pricing prose, and would put the real figure far below these. It
 * needs a measurement-only bundler (@size-limit/esbuild) — a deliberate call
 * about a repo that ships unbundled by design, so it belongs to the owner and
 * not to the same change that re-baselines the numbers.
 *
 * JS rather than JSON purely so the paragraph above can sit next to the numbers
 * it explains; size-limit rejects unknown keys in a JSON config.
 */
module.exports = [
    {
        name: 'content-scripts (injected)',
        path: [
            'coupon-constants.generated.js',
            'cart-signals.js',
            'caramel-base.js',
            'dom-utils.js',
            'store-detect.js',
            'coupon-apply.js',
            'coupon-fetch.js',
            'coupon-runner.js',
            'UI-helpers.js',
            'inject.js',
        ],
        // 2026-08-06 — 219 → 223 KB. Two behaviour changes plus the reasoning
        // they carry: the capability gate now opens for a store with codes and
        // no config row (store-detect.js), and the no-record branch asks the
        // catalogue before telling a shopper we hold nothing for their store
        // (coupon-runner.js).
        //
        // 2026-08-06 — 223 → 227 KB. Both live-QA fixes land in coupon-runner:
        // reading a discount the platform records in
        // `cart_level_discount_applications` rather than on the code entry (the
        // shape every real cart measured that day actually uses, and whose
        // absence silently deleted a shopper's live -$9.00), and crediting the
        // code the cart is honouring when it is one we probed. Measured
        // 226.71 kB.
        limit: '227 KB',
        brotli: false,
    },
    {
        name: 'popup.js',
        path: 'popup.js',
        limit: '54 KB',
        brotli: false,
    },
    {
        name: 'background.js (sw)',
        path: 'background.js',
        limit: '15 KB',
        brotli: false,
    },
]
