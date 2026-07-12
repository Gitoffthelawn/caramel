import { handleRouteError } from '@/lib/api/handleRouteError'
import { withRoute } from '@/lib/api/withRoute'
import {
    StoreConfigRowSchema,
    couponsSql,
    parseCouponRows,
} from '@/lib/couponsDb'
import { NextResponse } from 'next/server'

// Public read: the payload is xpath selectors already shipped to every
// extension install (background.js), so gating it behind a key has no
// secrecy value (F-003). Rate-limited like any other public read route. A
// stale x-api-key header from a pre-F-003 extension build is simply
// ignored — no cutover required, see PLAN-F-003.md §Breaking. KEYLESS by
// design post-F-003 — CR-8: no apiKey concern on this route.
export const GET = withRoute(
    {
        method: 'GET',
        routeName: 'extension/supported-stores',
        rateLimit: 'read',
    },
    async ({ req }) => {
        try {
            // One row per store, highest-priority active config that has xpath
            // selectors (excludes API-only configs which the extension can't use).
            const rawRows = await couponsSql`
            SELECT DISTINCT ON (s.store_name)
                s.store_name,
                cfg.show_input_xpath,
                cfg.dismiss_button_xpath,
                cfg.coupon_input_xpath,
                cfg.apply_button_xpath,
                cfg.price_container_xpath,
                cfg.success_indicator_xpath,
                cfg.error_indicator_xpath,
                cfg.coupon_remove_xpath
            FROM store_verification_configs cfg
            JOIN verification_stores s ON s.id = cfg.store_id
            WHERE cfg.is_active = TRUE
              -- Require only the 2 fields the extension's apply engine
              -- (coupon-apply.js) genuinely cannot work without: it fills
              -- coupon_input then clicks apply_button, and bails early with
              -- no fallback if either is missing/hidden. The other 3 xpaths
              -- this predicate used to require ALL have generic fallbacks in
              -- the apply engine (findAppliedSelector/detectCouponError/
              -- findRemoveSelector -> GENERIC_APPLIED_SELECTORS /
              -- GENERIC_ERROR_TEXT_RE / GENERIC_REMOVE_SELECTORS), so
              -- requiring them here was over-strict: it silently excluded
              -- ~25% of active configs — including the 3 demo stores
              -- (ebay.com/amazon.com/codecademy.com) — that the generic
              -- engine can actually drive fine (E2E report D1).
              AND cfg.coupon_input_xpath      IS NOT NULL
              AND cfg.apply_button_xpath      IS NOT NULL
              -- Honor the agent's extension_compatible verdict. Stores like
              -- christianbook.com have full xpaths but they live on the
              -- checkout page, not the entry_url cart page — the extension
              -- can't reach them. Agent / manual review sets this to false
              -- when it observes that selectors don't render at entry_url.
              AND COALESCE(cfg.metadata->>'extension_compatible', 'true') <> 'false'
            ORDER BY s.store_name, cfg.priority DESC, cfg.updated_at DESC
        `
            const rows = parseCouponRows(
                StoreConfigRowSchema,
                rawRows,
                'extension.supported-stores',
            )

            const supported = rows.map(r => ({
                domain: r.store_name,
                couponInput: r.coupon_input_xpath,
                couponSubmit: r.apply_button_xpath,
                priceContainer: r.price_container_xpath ?? undefined,
                showInput: r.show_input_xpath ?? undefined,
                dismissButton: r.dismiss_button_xpath ?? undefined,
                successIndicator: r.success_indicator_xpath ?? undefined,
                errorIndicator: r.error_indicator_xpath ?? undefined,
                couponRemove: r.coupon_remove_xpath ?? undefined,
            }))

            return NextResponse.json(
                { supported },
                {
                    headers: {
                        'Cache-Control':
                            'public, s-maxage=300, stale-while-revalidate=300',
                    },
                },
            )
        } catch (error) {
            console.error('[API][extension/supported-stores] error', error)
            return handleRouteError(error, {
                req,
                message: 'Internal server error',
            })
        }
    },
)
