import { handleRouteError } from '@/lib/api/handleRouteError'
import {
    StoreConfigRowSchema,
    couponsSql,
    parseCouponRows,
} from '@/lib/couponsDb'
import { checkRateLimit } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

// Public read: the payload is xpath selectors already shipped to every
// extension install (background.js), so gating it behind a key has no
// secrecy value (F-003). Rate-limited like any other public read route. A
// stale x-api-key header from a pre-F-003 extension build is simply
// ignored — no cutover required, see PLAN-F-003.md §Breaking.
export async function GET(req: NextRequest) {
    const limited = await checkRateLimit(req, 'read')
    if (limited) return limited

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
              -- Require the FULL 5-field extension contract. Partial configs
              -- (missing success/error/remove) cause the try-loop to either
              -- false-success on rejected codes or stack invalid coupons —
              -- the exact UX failures observed on logos.com pre-2026-05-02.
              AND cfg.coupon_input_xpath      IS NOT NULL
              AND cfg.apply_button_xpath      IS NOT NULL
              AND cfg.success_indicator_xpath IS NOT NULL
              AND cfg.error_indicator_xpath   IS NOT NULL
              AND cfg.coupon_remove_xpath     IS NOT NULL
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
}
