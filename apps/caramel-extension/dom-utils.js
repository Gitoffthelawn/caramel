// owns: DOM visibility/wait helpers, price parsing, CSS/XPath query helpers (_isVisible, waitForVisible, pickBestMatch, waitForElement, waitForTextChange, waitUntilReady, getPrice, _isXPath, qOne, qAll)
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
 * cannot swallow a legitimate target. */
const CARAMEL_FORBIDDEN_CONTROL_RE =
    /\b(place\s+(your\s+)?order|pay\s+(now|today)|complete\s+(your\s+)?(order|purchase)|submit\s+order|confirm\s+(and\s+pay|order|purchase)|buy\s+now|proceed\s+to\s+(pay|checkout)|checkout\s+now|delete\s+account|remove\s+(item|all))\b/i
// Called from other split content-script files (cross-file content-script
// call — oxlint's per-file analysis can't see it).
// oxlint-disable-next-line no-unused-vars
function caramelIsForbiddenControl(el) {
    if (!el) return false
    const parts = [
        el.innerText || el.textContent || '',
        el.getAttribute?.('aria-label') || '',
        el.value || '',
        el.getAttribute?.('name') || '',
        el.id || '',
    ]
    // id/name attributes spell the same words with separators ("pay-now",
    // "submit_order"), so flatten those to spaces before matching.
    return CARAMEL_FORBIDDEN_CONTROL_RE.test(
        parts.join(' ').replace(/[-_]+/g, ' '),
    )
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
