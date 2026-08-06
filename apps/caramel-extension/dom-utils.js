// owns: DOM visibility/wait helpers, price parsing, CSS/XPath query helpers, the mid-attempt navigation handoff (_isVisible, waitForVisible, pickBestMatch, waitForElement, waitForTextChange, waitUntilReady, getPrice, _isXPath, qOne, qAll, caramel{Mark,Clear,Take}PendingSubmit)
// load after: caramel-base.js

/* ---------- DOM waiters ---------- */
/* ---------- visibility helpers ---------- */
// "Can the user actually see this?" — checkVisibility() correctly handles
// display:none ancestors (collapsed accordions), visibility:hidden and
// content-visibility, and (unlike the old offsetParent test) doesn't
// false-negative inside position:fixed/sticky containers, where order-summary
// rails and their coupon UIs commonly live.
function _isVisible(el) {
    if (!el) return false
    try {
        if (typeof el.checkVisibility === 'function')
            return el.checkVisibility()
    } catch {
        /* fall through to the legacy heuristic */
    }
    return el.offsetParent !== null
}
// Wait until the selector matches a VISIBLE element. waitForElement only waits
// for presence — useless for reveal-toggles that unhide pre-rendered markup
// (the input already "exists" while still display:none). Checks ALL matches,
// not just the first: generic selectors often also hit hidden templates.
// Called from other split content-script files (see store-detect.js's
// startCheckoutDetection for why per-file analysis misses cross-file calls).
// oxlint-disable-next-line no-unused-vars
function waitForVisible(sel, timeout = 3000) {
    return new Promise((res, rej) => {
        const t0 = performance.now()
        ;(function poll() {
            if (qAll(sel).some(_isVisible)) return res('visible')
            if (performance.now() - t0 > timeout)
                return rej(`waitForVisible timeout (${sel})`)
            setTimeout(poll, 120)
        })()
    })
}
// Pick the best element among ALL matches of a config selector. Config
// selectors are often generic on purpose (Magento's `.title[data-role=title]`
// matches EVERY accordion section — Estimate Shipping, Gift Cards, the promo
// block…), and querySelector's "first match" can land on a hidden or wrong
// section. Generic disambiguation, no store logic:
//   1. if an anchor is given (usually the coupon input), prefer the match
//      sharing the SMALLEST containing block with it — the promo toggle sits
//      in the same block as the promo input; unrelated accordions don't;
//   2. otherwise prefer a VISIBLE match;
//   3. otherwise fall back to the first match.
/* Controls the extension must NEVER activate, whatever a config says.
 *
 * pickBestMatch falls back to "first visible match on the page" when nothing
 * sits near the coupon input. That is the right call for a promo toggle, but it
 * means a stale or over-broad apply/showInput selector (`button[type=submit]`
 * and friends) can resolve to the checkout's own order-completing control — and
 * the apply path dispatches a FULL pointer+click sequence, which such buttons
 * happily accept. A wrong config should cost the user a missed discount, never
 * an order placed with their saved payment method.
 *
 * Matched on the control's visible label and its accessible/name attributes.
 * A coupon apply button is never called "Pay now" or "Place order", so this
 * cannot swallow a legitimate target.
 *
 * Vocabulary scope: manifest.json matches https://*./* — every locale, not just
 * English — so the order verbs cover the languages our store list actually
 * reaches. Cart destruction ("empty cart") and session destruction ("log out")
 * are here for the same reason order placement is: a stale selector that
 * resolves to one costs the user their cart or their session, and the QA sweep
 * on 2026-08-05 clicked all three. */
const CARAMEL_FORBIDDEN_CONTROL_RE =
    /\b(place\s+(your\s+)?order|pay\s+(now|today)|complete\s+(your\s+)?(order|purchase)|submit\s+order|confirm\s+(and\s+pay|order|purchase)|buy\s+now|proceed\s+to\s+(pay|checkout)|checkout\s+now|delete\s+account)\b|\b(remove|delete)\s+(this\s+)?(item|product|line|all|address|card|everything|from\s+(bag|cart|basket|order))\b|\b(empty|clear)\s+(your\s+)?(cart|bag|basket|trolley)\b|\b(log|sign)\s*out\b|\b(jetzt\s+kaufen|kauf(en)?\s+abschlie(ss|ß)en|zahlungspflichtig\s+bestellen|bestellung\s+abschicken|commander(\s+et\s+payer)?|payer\s+maintenant|valider\s+(la\s+)?commande|realizar\s+(el\s+)?pedido|comprar\s+ahora|pagar\s+ahora|finalizar\s+(la\s+)?compra|acquista\s+ora|procedi\s+al\s+pagamento)\b/i

/* Every string a sighted or assistive-tech user would read as this control's
 * label. The guard used to read five properties; the QA sweep placed real
 * orders through three labelling patterns none of them covered — an icon
 * button labelled by <img alt>, by aria-labelledby, or by title=. Those are
 * not exotic: they are the three standard ways to label a button that shows
 * only an icon, which is exactly what checkout "pay" buttons often are. */
function _caramelControlLabelParts(el) {
    const parts = [
        el.innerText || el.textContent || '',
        el.getAttribute?.('aria-label') || '',
        el.getAttribute?.('title') || '',
        el.value || '',
        el.getAttribute?.('name') || '',
        el.id || '',
    ]
    // aria-labelledby points at the element(s) holding the real label.
    const labelledBy = el.getAttribute?.('aria-labelledby') || ''
    for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
        try {
            const ref = el.ownerDocument?.getElementById(id)
            if (ref) parts.push(ref.innerText || ref.textContent || '')
        } catch {
            /* a malformed id is not a reason to skip the rest */
        }
    }
    // An icon button's only human-readable text is often its image's alt.
    try {
        for (const img of el.querySelectorAll?.('img[alt], svg title') || [])
            parts.push(img.getAttribute?.('alt') || img.textContent || '')
    } catch {
        /* ditto */
    }
    return parts
}

// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
function caramelIsForbiddenControl(el) {
    if (!el) return false
    // id/name attributes spell the same words with separators ("pay-now",
    // "submit_order"), so flatten those to spaces before matching.
    return CARAMEL_FORBIDDEN_CONTROL_RE.test(
        _caramelControlLabelParts(el).join(' ').replace(/[-_]+/g, ' '),
    )
}

/* Fields that mean "submitting this form spends money". Matched on the
 * autocomplete tokens the HTML spec defines for payment instruments, plus the
 * name/id shapes checkouts use when they don't set autocomplete. */
const CARAMEL_PAYMENT_FIELD_SEL =
    'input[autocomplete^="cc-"], input[name*="cardnumber" i], input[name*="card_number" i], input[name*="cvv" i], input[name*="cvc" i], input[id*="cardnumber" i], input[id*="cardNumber"]'

/* Would activating this control submit something other than the coupon?
 *
 * The label guard above asks "is this element an order button". That is not
 * enough, because two proven order-placement paths never touch a labelled
 * order button at all: an apply button of type="submit" sitting inside the
 * checkout's own <form>, and the unconditional Enter keydown, which submits
 * whatever form the coupon input happens to live in. In both the element we
 * inspect is innocent ("Apply Discount") and the FORM is the danger.
 *
 * So this guards the ACTION rather than the element: a form carrying payment
 * credentials, or containing a control the label guard would refuse, is a form
 * we must never submit. A correctly-configured store is unaffected — Magento's
 * #discount-coupon-form and WooCommerce's .checkout_coupon are their own forms
 * and contain neither. */
// oxlint-disable-next-line no-unused-vars
function caramelFormSubmitIsUnsafe(el) {
    let form = null
    try {
        form = el?.form || el?.closest?.('form') || null
    } catch {
        return false
    }
    // No owning form means there is no implicit submission to worry about.
    if (!form) return false
    try {
        if (form.querySelector(CARAMEL_PAYMENT_FIELD_SEL)) return true
        for (const control of form.querySelectorAll(
            'button, input[type="submit"], input[type="button"], input[type="image"], [role="button"]',
        ))
            if (caramelIsForbiddenControl(control)) return true
    } catch {
        /* an unreadable form is not evidence of safety, but it is also not
           evidence of danger — fall through to the caller's other checks */
    }
    return false
}

/* The most visible matches a coupon selector can have and still plausibly be
 * pointing at a coupon control.
 *
 * A promo input or its reveal toggle is ONE element. Configs legitimately list
 * a few alternatives ("#a, .b, [c]") and themes sometimes render a mobile and a
 * desktop copy, so a handful is normal — a live audit of the served catalogue
 * puts real configs at 1-3 visible matches. Anything past this is not a promo
 * box under any reading. */
const CARAMEL_MAX_COUPON_ANCHORS = 8

/* Visible elements a coupon selector resolves to, or [] if the selector is so
 * broad it cannot be describing a coupon control.
 *
 * Checkout detection asks "is a way to enter a code visible here?". A config
 * whose showInput contains a clause like `button:has(> *)` answers yes on
 * literally every page of the site — measured live on mejuri.com at 389 visible
 * matches on a category page, 48 on the homepage (QA sweep 2026-08-05). Today
 * that store is saved only by having no coupons in the database; the first code
 * scraped for it would put the prompt on every product and category page.
 *
 * Treating over-broad as NO match is the safe direction: a selector this loose
 * carries no information about where the promo box is, so acting on it means
 * guessing, and pickBestMatch's "first visible match in document order"
 * fallback would then be picking an arbitrary button on the page. Losing the
 * prompt on a misconfigured store costs a discount; keeping it costs the user a
 * prompt that follows them around the whole site and an apply flow aimed at
 * whatever element happened to sort first. */
// oxlint-disable-next-line no-unused-vars
function caramelCouponAnchors(sel) {
    if (!sel) return []
    const visible = qAll(sel).filter(_isVisible)
    if (visible.length > CARAMEL_MAX_COUPON_ANCHORS) {
        log('CARAMEL_SELECTOR_TOO_BROAD', {
            sel: String(sel).slice(0, 120),
            visible: visible.length,
            max: CARAMEL_MAX_COUPON_ANCHORS,
        })
        return []
    }
    return visible
}

// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
function pickBestMatch(sel, anchorEl) {
    const all = qAll(sel)
    if (!all.length) return null
    if (anchorEl) {
        let best = null
        let bestDepth = Infinity
        let bestVisible = false
        for (const cand of all) {
            let p = cand.parentElement
            let d = 0
            while (p && d < 8) {
                if (p.contains(anchorEl)) {
                    const v = _isVisible(cand)
                    if (
                        d < bestDepth ||
                        (d === bestDepth && v && !bestVisible)
                    ) {
                        bestDepth = d
                        best = cand
                        bestVisible = v
                    }
                    break
                }
                p = p.parentElement
                d++
            }
        }
        if (best) return best
    }
    return all.find(_isVisible) || all[0]
}
// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
function waitForElement(sel, timeout = 4000) {
    return new Promise((res, rej) => {
        if (qOne(sel)) return res('found-immediately')
        const mo = new MutationObserver(() => {
            if (qOne(sel)) {
                mo.disconnect()
                res('appeared')
            }
        })
        mo.observe(document.documentElement, { childList: true, subtree: true })
        setTimeout(() => {
            mo.disconnect()
            rej(`waitForElement timeout (${sel})`)
        }, timeout)
    })
}
// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
function waitForTextChange(el, timeout = 3000) {
    return new Promise((res, rej) => {
        const start = el.textContent
        const mo = new MutationObserver(() => {
            if (el.textContent !== start) {
                mo.disconnect()
                res('text-changed')
            }
        })
        mo.observe(el, { characterData: true, childList: true, subtree: true })
        setTimeout(() => {
            mo.disconnect()
            rej('waitForTextChange timeout')
        }, timeout)
    })
}
/* ---------- UI readiness helper ---------- */
// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
async function waitUntilReady(rec, timeout = 2000) {
    const btn = qOne(rec.couponSubmit)
    const start = performance.now()
    return new Promise(resolve => {
        ;(function loop() {
            if (!btn || !btn.disabled) return resolve()
            if (performance.now() - start > timeout) return resolve() // hard fallback
            requestAnimationFrame(loop)
        })()
    })
}

/* --------------------------------------------------  price grabber */
// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
function getPrice(selector, { returnLargest } = {}) {
    let el = qOne(selector)
    if (!el && typeof selector === 'string' && selector.includes('[id=')) {
        const id = selector.match(/\[id=['"]([^'"]+)['"]\]/)?.[1]
        if (id) el = document.getElementById(id)
    }
    if (!el) {
        log('getPrice: element NOT found', selector)
        return NaN
    }

    const regex = /(?:[A-Z]{1,3}\s?)?[$£€]\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g
    const tokens = el.innerText.match(regex) || []
    const prices = tokens.map(t => parseFloat(t.replace(/[^0-9.]/g, '')))
    if (!prices.length) {
        log('getPrice: no price found')
        return NaN
    }
    if (returnLargest) _caramelLastPrices = prices.slice()
    const idx = returnLargest ? prices.indexOf(Math.max(...prices)) : 0
    // Remember the symbol that came with the price we actually returned, so
    // the savings we report back are denominated in the SAME currency the
    // cart is priced in. Reporting "$8.00" for an £8.00 saving is a bug the
    // user can see, and a config can't be trusted to tell us the currency.
    const sym = tokens[idx].match(/[$£€]/)
    if (sym) _caramelLastCurrency = sym[0]
    return prices[idx]
}

// Guarded `var` (re-injection convention). Defaults to '$' until a real
// price has been read.
if (typeof _caramelLastCurrency === 'undefined') {
    var _caramelLastCurrency = '$'
}

// EVERY price parsed out of the container on the last returnLargest read, not
// just the winner. A checkout panel routinely shows several ($42.00 total, a
// "$500 off" banner, an MSRP strikethrough) and the config can't tell us which
// is the order total — so the caller keeps the full set and picks the most
// conservative baseline it can defend. See caramelBaselineFor().
if (typeof _caramelLastPrices === 'undefined') {
    var _caramelLastPrices = []
}

/* The tightest cart baseline consistent with an observed post-discount total:
 * the SMALLEST price seen in the container that is still >= `newTotal`.
 *
 * Taking the LARGEST number (what getPrice must do to find an order total) is
 * what lets a stray "$500 off" banner masquerade as the cart's original price
 * and turn a real $4.20 discount into a $462.20 headline. Choosing the smallest
 * candidate at or above the new total can never OVERSTATE a saving: any larger
 * candidate would have to be a number the discount didn't actually come off.
 *
 * Returns NaN when nothing qualifies (e.g. the total went UP) — the caller then
 * claims no figure at all. */
// oxlint-disable-next-line no-unused-vars
function caramelBaselineFor(newTotal, prices = _caramelLastPrices) {
    if (typeof newTotal !== 'number' || isNaN(newTotal)) return NaN
    const candidates = (prices || []).filter(p => !isNaN(p) && p >= newTotal)
    return candidates.length ? Math.min(...candidates) : NaN
}
// Consumed by UI-helpers.js when rendering a measured saving.
// oxlint-disable-next-line no-unused-vars
function caramelCurrencySymbol() {
    return _caramelLastCurrency || '$'
}

/* ISO code for the symbol we actually parsed off the page, for the savings
 * HISTORY. The modal renders the symbol, but the popup totals the history per
 * currency through Intl.NumberFormat (popup.js:81-98), which needs a code —
 * and banking every DOM-path win as 'USD' silently added £ and € savings into
 * the dollar bucket, overstating a non-US user's lifetime total.
 * '$' stays USD: a bare dollar sign can't distinguish USD/CAD/AUD, and USD is
 * the safest reading of an unqualified '$'. The discount-link path doesn't use
 * this — /cart.js hands it a real ISO code. */
// Consumed by coupon-runner.js (cross-file content-script call).
// oxlint-disable-next-line no-unused-vars
function caramelCurrencyCode() {
    return { '£': 'GBP', '€': 'EUR' }[_caramelLastCurrency] || 'USD'
}

/* Set the symbol explicitly when the currency is known from data rather than
 * from a price we just parsed — the post-reload handoff (store-detect.js)
 * restores a saving recorded BEFORE the reload, so no price has been read in
 * this page yet and the parsed value would still be the '$' default. */
// oxlint-disable-next-line no-unused-vars
function caramelSetCurrencySymbol(sym) {
    if (typeof sym === 'string' && /^[$£€]$/.test(sym)) {
        _caramelLastCurrency = sym
        return true
    }
    return false
}

/* --------------------------------------------------  disclosure reveal
 *
 * The control that would reveal a promo box the shopper cannot currently see,
 * found from the box itself rather than from a per-store selector.
 *
 * "Visible" is the right test for whether to offer help — themes ship dead
 * coupon markup on pages that have no checkout. But it conflates two very
 * different situations: markup that is hidden because it is inert, and markup
 * hidden behind a disclosure the shopper can open in one tap. The QA sweep on
 * 2026-08-05 measured what the second costs:
 *
 *   - allbirds.com on a phone: Shopify collapses the order summary into a bar,
 *     and the discount field lives inside it. 30s on the cart drawer and 30s at
 *     checkout produced nothing; expanding the summary produced the prompt
 *     within the same second. An A/B/A across three reloads (1440 shows, 390
 *     doesn't, 1440 shows) confirmed it, and 900/700/500 were silent too — so
 *     this is small laptops and split screens as well as phones.
 *   - allposters.com at 1440: promo box behind "+ Add a Promo Code". Same
 *     signature — in the DOM, not visible, no prompt for 25s, prompt the moment
 *     the section was opened.
 *
 * Configs can already name that toggle (`showInput`), and stores that carry one
 * work fine; most simply never got one. This finds the toggle generically, from
 * the standard disclosure vocabulary, and is deliberately narrow: the control
 * must govern an ANCESTOR of the coupon input the config itself names, must be
 * visible, must not already be expanded, and must pass the order-button guard.
 * When nothing matches it returns null and behaviour is exactly as before.
 */
const CARAMEL_MAX_DISCLOSURE_DEPTH = 6
// Consumed by store-detect.js and coupon-runner.js (cross-file calls).
// oxlint-disable-next-line no-unused-vars
function caramelDisclosureFor(el) {
    // Only ever for a box the shopper CAN'T see. A visible box needs no reveal.
    if (!el || _isVisible(el)) return null
    const usable = c =>
        c &&
        _isVisible(c) &&
        c.getAttribute?.('aria-expanded') !== 'true' &&
        !caramelIsForbiddenControl(c)
    let node = el
    for (let up = 0; up < CARAMEL_MAX_DISCLOSURE_DEPTH && node; up++) {
        node = node.parentElement
        if (!node) break
        // Native disclosure: <details> closed, <summary> opens it.
        if (node.tagName === 'DETAILS' && !node.open) {
            const summary = node.querySelector('summary')
            if (usable(summary)) return summary
        }
        // ARIA disclosure: some control elsewhere on the page names this
        // container in aria-controls. That is the pattern both measured stores
        // use, and it is how a screen-reader user finds the same toggle.
        if (node.id) {
            let controllers = []
            try {
                const id =
                    typeof CSS !== 'undefined' && CSS.escape
                        ? CSS.escape(node.id)
                        : node.id
                controllers = Array.from(
                    document.querySelectorAll(`[aria-controls="${id}"]`),
                )
            } catch {
                /* an id we can't express as a selector — try the next ancestor */
            }
            const toggle = controllers.find(usable)
            if (toggle) return toggle
        }
    }
    return null
}

/* --------------------------------------------------  navigation handoff
 *
 * Submitting a promo code on a classic (non-SPA) checkout is a form POST: the
 * page navigates, the content script and every overlay it drew are destroyed
 * mid-attempt, and everything the run knew dies with them. Measured on
 * 1800petmeds.com (QA sweep 2026-08-05): THEO20 took a real $14.78 off the
 * order and the user was told NOTHING for the ~180s they sat there — the fresh
 * document just re-inserted the "Try Caramel Coupons" pill, as if the extension
 * had never run. A win we actually delivered read as a dead feature.
 *
 * The discount-link path already survives its own (deliberate) reload through
 * sessionStorage; this is the same handoff for the path that navigates without
 * being asked. The crucial difference: this record carries only what we KNEW
 * BEFORE submitting — the code, its id, and the prices then on the page — and
 * never an outcome. At write time we genuinely do not know whether the code
 * landed, so the next document measures that for itself
 * (store-detect.js:_resumePendingSubmit). A record that guessed would put a
 * fabricated saving in the user's history.
 *
 * These live here, in the leaf, rather than beside the apply loop: the writer
 * (coupon-runner.js) and the reader (store-detect.js) are different files, and
 * store-detect loads FIRST — sharing a key through a top-level const would
 * depend on load order that doesn't hold.
 *
 * sessionStorage, like the tried-codes set: per-tab and per-origin, so a
 * pending attempt can never surface on another site or in another tab, and it
 * dies with the tab.
 */
const CARAMEL_PENDING_KEY = 'caramel_pending_submit'
// Consumed by coupon-runner.js (cross-file content-script call).
// oxlint-disable-next-line no-unused-vars
function caramelMarkPendingSubmit(code, id, prices) {
    try {
        sessionStorage.setItem(
            CARAMEL_PENDING_KEY,
            JSON.stringify({
                code,
                id: id ?? null,
                prices: (prices || []).filter(
                    p => typeof p === 'number' && !isNaN(p),
                ),
                t: Date.now(),
            }),
        )
    } catch {
        /* storage blocked — we lose only the post-navigation report */
    }
}
// Consumed by coupon-runner.js (cross-file content-script call).
// oxlint-disable-next-line no-unused-vars
function caramelClearPendingSubmit() {
    try {
        sessionStorage.removeItem(CARAMEL_PENDING_KEY)
    } catch {
        /* storage blocked — the freshness window bounds the damage */
    }
}
/* Reads AND consumes the record: a pending attempt is reported once, on the
 * document that follows it, or not at all. Returns null when there is nothing
 * to resume or the record is stale/unreadable. */
// Consumed by store-detect.js (cross-file content-script call).
// oxlint-disable-next-line no-unused-vars
function caramelTakePendingSubmit(maxAgeMs = 120000) {
    let raw = null
    try {
        raw = sessionStorage.getItem(CARAMEL_PENDING_KEY)
        if (raw) sessionStorage.removeItem(CARAMEL_PENDING_KEY)
    } catch {
        return null
    }
    if (!raw) return null
    let st = null
    try {
        st = JSON.parse(raw)
    } catch {
        return null
    }
    if (!st || typeof st.code !== 'string' || !st.code) return null
    // A record older than the window belongs to a visit the user has moved on
    // from; announcing it over an unrelated page would be noise, not news.
    if (!(Date.now() - (st.t || 0) < maxAgeMs)) return null
    return {
        code: st.code,
        id: st.id ?? null,
        prices: Array.isArray(st.prices) ? st.prices : [],
    }
}

/* --------------------------------------------------  selector helper
 * Configs may store either a CSS selector or an XPath expression. The agent
 * picks whichever uniquely identifies the element on each store. Detect by
 * leading char and dispatch to the right DOM API.
 *   "input#code"           → CSS  → querySelector
 *   "//input[@id='code']"  → XPath → document.evaluate
 *   "(//div)[2]"           → XPath
 */
function _isXPath(sel) {
    if (typeof sel !== 'string' || !sel) return false
    const t = sel.trim()
    return t.startsWith('/') || t.startsWith('(/') || t.startsWith('./')
}
function qOne(sel, root) {
    if (!sel) return null
    root = root || document
    try {
        if (_isXPath(sel)) {
            const res = document.evaluate(
                sel,
                root,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null,
            )
            return res.singleNodeValue
        }
        return root.querySelector(sel)
    } catch {
        return null
    }
}
function qAll(sel, root) {
    if (!sel) return []
    root = root || document
    try {
        if (_isXPath(sel)) {
            const res = document.evaluate(
                sel,
                root,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null,
            )
            const out = []
            for (let i = 0; i < res.snapshotLength; i++)
                out.push(res.snapshotItem(i))
            return out
        }
        return Array.from(root.querySelectorAll(sel))
    } catch {
        return []
    }
}
