/********************************************************************
 * Caramel core logic – 2025-06-29  (speed-tuned)
 ********************************************************************/

/* --------------------------------------------------  bootstrap */
// Track script loading to prevent redeclaration errors on multiple loads
if (typeof window !== 'undefined') {
    if (window.__caramel_shared_utils_loaded) {
        // Script already loaded - use existing window.currentBrowser
        // Don't redeclare to avoid errors
    } else {
        window.__caramel_shared_utils_loaded = true

        // First load - create currentBrowser on window
        window.currentBrowser = (() => {
            if (typeof chrome !== 'undefined') return chrome
            if (typeof browser !== 'undefined') return browser
            throw new Error('Browser is not supported!')
        })()
    }
    // Ensure window.currentBrowser exists
    if (!window.currentBrowser) {
        window.currentBrowser = (() => {
            if (typeof chrome !== 'undefined') return chrome
            if (typeof browser !== 'undefined') return browser
            throw new Error('Browser is not supported!')
        })()
    }
    // Create local reference - var allows redeclaration, so this is safe even on second load
    var currentBrowser = window.currentBrowser
} else {
    // Non-window environment (service worker) - safe to declare normally
    var currentBrowser = (() => {
        if (typeof chrome !== 'undefined') return chrome
        if (typeof browser !== 'undefined') return browser
        throw new Error('Browser is not supported!')
    })()
}

/* --------------------------------------------------  tiny helpers */
// Check if already declared to prevent redeclaration errors on script reload
if (typeof sleep === 'undefined') {
    var sleep = ms => new Promise(r => setTimeout(r, ms))
}
if (typeof log === 'undefined') {
    // Verbose only on unpacked dev installs; silent in the packed Web Store
    // build so we don't leak coupon/flow internals into every store's console.
    var log = _isDevInstall()
        ? (...a) => console.log('Caramel:', ...a)
        : () => {}
}
if (typeof recordTiming === 'undefined') {
    var recordTiming = (event, meta = {}) => {
        try {
            const entry = { event, t: performance.now(), meta }
            if (
                currentBrowser &&
                currentBrowser.storage &&
                currentBrowser.storage.local
            ) {
                currentBrowser.storage.local.get(['caramel_timings'], res => {
                    const arr = (res && res.caramel_timings) || []
                    arr.push(entry)
                    currentBrowser.storage.local.set({ caramel_timings: arr })
                })
            }
        } catch (e) {
            // ignore storage errors
        }
    }
}

// Origins trusted to inject a login token via window.postMessage. The dev
// origins are ONLY trusted on an unpacked dev install — in the packed Web Store
// build a tab on dev.grabcaramel.com or a local server must NOT be able to write
// credentials into a real user's extension storage.
const CARAMEL_ALLOWED_ORIGINS = new Set([
    'https://grabcaramel.com',
    ...(_isDevInstall()
        ? ['http://localhost:58300', 'https://dev.grabcaramel.com']
        : []),
])

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
    } catch (e) {
        /* fall through to the legacy heuristic */
    }
    return el.offsetParent !== null
}
// Wait until the selector matches a VISIBLE element. waitForElement only waits
// for presence — useless for reveal-toggles that unhide pre-rendered markup
// (the input already "exists" while still display:none). Checks ALL matches,
// not just the first: generic selectors often also hit hidden templates.
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
    const prices = (el.innerText.match(regex) || []).map(t =>
        parseFloat(t.replace(/[^0-9.]/g, '')),
    )
    if (!prices.length) {
        log('getPrice: no price found')
        return NaN
    }
    return returnLargest ? Math.max(...prices) : prices[0]
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
    } catch (e) {
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
    } catch (e) {
        return []
    }
}

/* --------------------------------------------------  config cache */
const STORE_CACHE_KEY = 'caramel_supported_stores'
const STORE_CACHE_PROD_TTL = 60 * 60 * 1000 // 1 hour
const STORE_CACHE_DEV_TTL = 0 // bypass cache when loaded as unpacked dev extension

// Dev-mode detection that works in BOTH popup AND content-script contexts.
// chrome.management only exists in the service worker, but
// chrome.runtime.getManifest() works everywhere.
// Production (Chrome Web Store) installs have an `update_url` field;
// unpacked dev extensions don't.
function _isDevInstall() {
    try {
        if (typeof chrome === 'undefined' || !chrome.runtime?.getManifest)
            return false
        const m = chrome.runtime.getManifest()
        return !m.update_url
    } catch (_) {
        return false
    }
}

function _getCacheTtl() {
    return _isDevInstall() ? STORE_CACHE_DEV_TTL : STORE_CACHE_PROD_TTL
}

async function getDomainRecord(domain) {
    if (!getDomainRecord.cache) {
        const ttl = _getCacheTtl()
        // Check chrome.storage.local for a recent cached copy first
        try {
            const stored =
                ttl > 0
                    ? await new Promise(r =>
                          currentBrowser.storage.local.get(
                              [STORE_CACHE_KEY],
                              r,
                          ),
                      )
                    : null
            const entry = stored?.[STORE_CACHE_KEY]
            if (ttl > 0 && entry?.data?.length && Date.now() - entry.ts < ttl) {
                getDomainRecord.cache = entry.data
                log('Loaded supported domains from local cache')
            }
        } catch (_) {
            /* storage read failed, proceed to API */
        }

        // Fetch fresh configs from the backend
        if (!getDomainRecord.cache) {
            try {
                const resp = await new Promise(res =>
                    currentBrowser.runtime.sendMessage(
                        { action: 'fetchSupportedStores' },
                        res,
                    ),
                )
                if (resp?.supported?.length) {
                    getDomainRecord.cache = resp.supported
                    currentBrowser.storage.local.set({
                        [STORE_CACHE_KEY]: {
                            data: resp.supported,
                            ts: Date.now(),
                        },
                    })
                    log('Loaded supported domains from API')
                }
            } catch (e) {
                log('fetchSupportedStores error', e)
            }
        }

        // If API failed, try expired cache as last resort
        if (!getDomainRecord.cache) {
            try {
                const stored = await new Promise(r =>
                    currentBrowser.storage.local.get([STORE_CACHE_KEY], r),
                )
                const entry = stored?.[STORE_CACHE_KEY]
                if (entry?.data?.length) {
                    getDomainRecord.cache = entry.data
                    log('Loaded supported domains from expired cache')
                }
            } catch (_) {
                /* nothing we can do */
            }
        }
    }
    return getDomainRecord.cache?.find(r =>
        _hostMatchesDomain(domain, r.domain),
    )
}
getDomainRecord.cache = null

// Match the active hostname to a supported-store domain. Accept an exact match,
// a real dotted subdomain (www./checkout./secure.<domain>), or a hyphen-prefixed
// checkout host (gapfactory-style `secure-<brand>.gapfactory.com`). Plain
// substring matching (the old behavior) false-matched unrelated hosts —
// `art.com` ⊂ `walmart.com`, `bestbuy.com` ⊂ `notbestbuy.com`, even
// `target.com` ⊂ `evil-target.com.attacker.net` — which would apply the wrong
// store's selectors to an unrelated site. Require a label boundary (start, '.'
// or '-') so only genuine same-site hosts match.
function _hostMatchesDomain(host, domain) {
    if (!host || !domain) return false
    host = String(host).toLowerCase()
    domain = String(domain).toLowerCase()
    if (host === domain) return true
    const i = host.length - domain.length
    if (i <= 0) return false
    if (host.slice(i) !== domain) return false
    const sep = host[i - 1]
    return sep === '.' || sep === '-'
}

/* --------------------------------------------------  checkout detector */
async function isCheckout() {
    const rec = await getDomainRecord(location.hostname)
    if (!rec) return false
    // VISIBLE, not merely present: themes ship hidden coupon markup on
    // non-checkout pages, and some configs point showInput at site-wide
    // controls — the prompt belongs only where the user can actually see a
    // way to enter a code. Same semantics as the re-detection observer.
    const anyVisible = () =>
        [rec.couponInput, rec.showInput]
            .filter(Boolean)
            .some(sel => qAll(sel).some(_isVisible))
    if (anyVisible()) return true
    // Only wait on the selectors the config actually provides — a bare
    // `${null},${null}`/`,${x}` compound is a wasted 3s wait (or a thrown
    // selector that waitForElement just swallows).
    const waitSel = [rec.couponInput, rec.showInput].filter(Boolean).join(',')
    if (waitSel) {
        try {
            await waitForElement(waitSel, 3000)
        } catch (e) {
            log(e)
        }
    }
    return anyVisible()
}

/* Coupon-availability cache — fetched once when a checkout is detected so we
   can decide whether to even show the prompt, and reused by the apply flow
   (no double fetch). Keyed by domain. Guarded var for re-injection safety. */
if (typeof _caramelCodes === 'undefined') {
    var _caramelCodes = null // { domain, list }
}
async function getCachedCodes(rec) {
    if (_caramelCodes && _caramelCodes.domain === rec.domain)
        return _caramelCodes.list
    let list = []
    try {
        list = await fetchCoupons(rec.domain, '', '')
    } catch (e) {
        list = []
    }
    _caramelCodes = {
        domain: rec.domain,
        list: Array.isArray(list) ? list : [],
    }
    return _caramelCodes.list
}

/* --------------------------------------------------  init hook */
async function tryInitialize() {
    if (!(await isCheckout())) return
    const rec = await getDomainRecord(location.hostname)
    if (!rec) return
    // Don't intercept a checkout we have no codes for — only show the prompt
    // when there's actually something to apply ("checkout without code → why the
    // intercept?"). The fetched list is cached for the apply step.
    const codes = await getCachedCodes(rec)
    if (codes.length) await insertCaramelPrompt(rec)
}

/* Entry point. Beyond the one-shot load check, KEEP WATCHING: on SPA / drawer-
   cart stores (allsaints and most SFCC/Shopify sites) the coupon field is
   injected only when the user opens the bag/cart — with no page navigation, so
   a load-time check finds nothing and the user sees nothing even though the
   promo box is right there. Re-detect it: observe the DOM and show the prompt
   the moment the coupon field appears. Debounced + self-disconnects after it
   fires once, so it costs ~nothing and never nags. */
async function startCheckoutDetection() {
    // A discount-link apply reloads the page so the store's own UI shows the
    // applied code; finish that flow on the fresh document by showing the
    // result modal instead of re-prompting.
    try {
        const raw = sessionStorage.getItem('caramel_applied')
        if (raw) {
            sessionStorage.removeItem('caramel_applied')
            const st = JSON.parse(raw)
            if (st && st.code && Date.now() - (st.t || 0) < 120000) {
                let amount = st.saved || 0
                let msg = null
                if (st.currency && st.currency !== 'USD' && amount > 0) {
                    // The built-in savings line renders "$X" — mislabels
                    // non-USD stores. Present the correctly-formatted amount
                    // through the applied-code presentation instead.
                    try {
                        const fmt = new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: st.currency,
                        }).format(amount)
                        msg = `Code ${st.code} saved you ${fmt} — it's applied to your order.`
                        amount = 0
                    } catch (e) {
                        /* unknown currency code — fall back to $ */
                    }
                }
                showFinalModal(amount, st.code, msg)
                return
            }
        }
    } catch (e) {
        /* sessionStorage unavailable — continue with normal detection */
    }
    await tryInitialize()
    if (window.__caramel_checkout_observer) return
    const rec = await getDomainRecord(location.hostname)
    if (!rec) return // not a supported store — don't observe at all
    let scheduled = false
    const _vis = _isVisible
    const recheck = () => {
        scheduled = false
        // Don't re-prompt if the prompt is already up or we're mid-apply.
        if (
            document.getElementById('caramel-small-prompt') ||
            document.getElementById('caramel-testing-overlay') ||
            document.getElementById('caramel-final-overlay')
        )
            return
        // Require the coupon box (or its reveal toggle) to be VISIBLE, not just
        // present — so a hidden, pre-rendered cart drawer doesn't pop the prompt
        // before the user actually opens the cart.
        if (_vis(qOne(rec.couponInput)) || _vis(qOne(rec.showInput))) {
            // Only prompt if we actually have codes for this store (no empty
            // intercept). getCachedCodes is cached, so this is cheap.
            getCachedCodes(rec).then(codes => {
                if (
                    !codes.length ||
                    document.getElementById('caramel-small-prompt') ||
                    document.getElementById('caramel-testing-overlay') ||
                    document.getElementById('caramel-final-overlay')
                )
                    return
                insertCaramelPrompt(rec)
                if (window.__caramel_checkout_observer) {
                    window.__caramel_checkout_observer.disconnect()
                    window.__caramel_checkout_observer = null
                }
            })
        }
    }
    const mo = new MutationObserver(() => {
        if (scheduled) return
        scheduled = true
        setTimeout(recheck, 400)
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
    window.__caramel_checkout_observer = mo
}

// Generic selectors used when the per-store config doesn't specify them.
// These cover the most common Honey-style cart UIs.
const GENERIC_APPLIED_SELECTORS =
    '[class*="coupon-applied" i], [class*="discount-applied" i], ' +
    '[class*="cart-coupon-list" i] li, [class*="applied-coupon" i], ' +
    '[class*="coupon-list-item" i], [class*="redeemed" i]'
const GENERIC_REMOVE_SELECTORS =
    '[class*="cart-coupon-list" i] li button, [class*="coupon-list-item" i] button, ' +
    '[class*="applied-coupon" i] button, [aria-label*="Remove" i], ' +
    '[aria-label*="Delete" i], button[title*="Remove" i]'
const GENERIC_ERROR_TEXT_RE =
    /\b(invalid|expired|not\s+(valid|applicable|eligible)|limited\s+to|cannot\s+be\s+(applied|redeemed)|doesn'?t\s+apply|no\s+eligible|enter\s+a\s+valid|nicht|ungültig)\b/i

function findAppliedSelector(rec) {
    return rec.successIndicator || GENERIC_APPLIED_SELECTORS
}
function findRemoveSelector(rec) {
    return rec.couponRemove || GENERIC_REMOVE_SELECTORS
}

// Set value on a (possibly React-controlled) input + fire input/change events.
function setInputValue(input, code) {
    const proto = window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(input, code)
    else input.value = code
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
}

// Try to remove the most-recently-applied coupon. Returns true if a remove
// button was clicked. Caller should wait for the cart to update.
async function removeAppliedCoupon(rec) {
    // Prefer per-config remove; fall back to generic.
    const sel = findRemoveSelector(rec)
    // qAll (not raw querySelectorAll) so an XPath couponRemove selector is
    // evaluated correctly instead of throwing a SyntaxError that aborts removal.
    const candidates = qAll(sel).filter(b => _isVisible(b) && !b.disabled)
    if (candidates.length) {
        // The newest applied coupon is usually rendered last → click last one.
        const btn = candidates[candidates.length - 1]
        btn.click()
        await sleep(600)
        log('Removed applied coupon via', sel)
        return true
    }
    // Last resort: clear the input. Some sites tie this to "remove".
    const input = qOne(rec.couponInput)
    if (input && input.value) {
        setInputValue(input, '')
        await sleep(300)
        log('Cleared input as remove fallback')
        return true
    }
    return false
}

// Detect if an error message appeared near the cart/coupon UI.
// Pick the first VISIBLE non-empty match across all elements that match the
// errorIndicator selector. Some Shopify themes (paragonsports, others) ship
// two `.alert.alert--error` elements: a hidden empty placeholder and a
// real one that fills with text. `qOne` would return the placeholder and
// miss the real error. Iterate so we always observe the live one.
function _firstVisibleErrorEl(rec) {
    if (!rec.errorIndicator) return null
    const all = qAll(rec.errorIndicator)
    for (const el of all) {
        if (!el || !_isVisible(el)) continue
        const t = (el.innerText || '').trim()
        if (t.length) return el
    }
    // No visible non-empty match — return the first match (so callers can
    // still observe "exists but hidden/empty" baseline state).
    return all[0] || null
}

function snapshotErrorState(rec) {
    // Capture the error region's text + visibility BEFORE we apply, so we can
    // tell whether an error appeared *because of this attempt* vs. a stale
    // error container that some sites keep mounted (aria-live regions,
    // placeholder error rows, etc.). Without this snapshot the extension
    // would treat permanently-mounted empty error containers as "error
    // present" and loop forever even after a valid coupon applied.
    if (!rec.errorIndicator) return { text: '', visible: false }
    const el = _firstVisibleErrorEl(rec)
    if (!el) return { text: '', visible: false }
    return {
        text: (el.innerText || '').trim(),
        visible: _isVisible(el),
    }
}

const ERROR_WORDS_RE =
    /\b(invalid|expired|not valid|doesn'?t apply|cannot be applied|cannot apply|already used|no longer|reached the limit|minimum|coupon code is required|wrong code)\b/i

function detectCouponError(rec, baseline, code) {
    // baseline is what snapshotErrorState() returned BEFORE the apply.
    // code is the coupon string we just tried.
    //
    // We only call something an "error" if the change is "about" this
    // attempt. Sites like logos.com keep an aria-live status region
    // permanently mounted and rotate text through it (success messages,
    // hints, prior errors) — naive presence checks on those false-positive
    // forever and the loop never stops on a valid coupon.
    if (rec.errorIndicator) {
        const el = _firstVisibleErrorEl(rec)
        if (el && _isVisible(el)) {
            const t = (el.innerText || '').trim()
            if (t.length) {
                const tl = t.toLowerCase()
                // Strongest signal: text mentions the code we just tried.
                if (code && tl.includes(code.toLowerCase())) return t
                // Strong signal: classic rejection vocabulary.
                if (ERROR_WORDS_RE.test(tl)) return t
                // Otherwise — ambiguous status text. Treat as new error
                // only if the container first appeared (was hidden, now
                // shown) — never on text-changed-but-still-vague.
                if (baseline && !baseline.visible && _isVisible(el)) {
                    return t
                }
                return null // generic / stale status copy → not our error
            }
        }
    }
    // Generic: look near the input for an inline error matching common phrases.
    const input = pickBestMatch(rec.couponInput)
    if (!input) return null
    let scope = input.parentElement
    for (let d = 0; d < 5 && scope; d++) {
        const text = (scope.innerText || '').trim()
        if (text && GENERIC_ERROR_TEXT_RE.test(text)) {
            const idx = text.search(GENERIC_ERROR_TEXT_RE)
            return text
                .slice(Math.max(0, idx - 40), idx + 120)
                .replace(/\s+/g, ' ')
                .trim()
        }
        scope = scope.parentElement
    }
    return null
}

/* --------------------------------------------------  coupon attempt */
async function applyCoupon(code, rec) {
    const attemptStart = performance.now()
    log('AUTO_INSERT_ATTEMPT_START', code, { t: attemptStart })
    recordTiming('AUTO_INSERT_ATTEMPT_START', { code })
    try {
        /* 1] dismiss popup if present */
        if (rec.dismissButton) {
            const btn = qOne(rec.dismissButton)
            if (btn) {
                btn.click()
                await sleep(180)
                log('Popup dismissed')
            }
        }

        /* 2] ensure input visible — "present" is NOT enough. Magento-class
             carts pre-render the whole coupon form inside a collapsed
             accordion (display:none content, visible "APPLY PROMO CODE"
             toggle). Typing into the hidden input and clicking the hidden
             apply button reaches NO form submission at all (proven live on
             naturepedic: hidden click → zero submit; after clicking the
             toggle, the identical sequence fires the real couponPost). So:
             if the input is missing OR hidden, click showInput and wait for
             the input to become VISIBLE, not merely attached. */
        let input = pickBestMatch(rec.couponInput)
        if ((!input || !_isVisible(input)) && rec.showInput) {
            const showBtn = pickBestMatch(rec.showInput, input)
            if (showBtn) {
                showBtn.click()
                try {
                    await waitForVisible(rec.couponInput, 3000)
                } catch (e) {
                    log(e)
                    // Late-bound accordion widgets (RequireJS) can miss the
                    // first click — one bounded retry.
                    showBtn.click()
                    try {
                        await waitForVisible(rec.couponInput, 1500)
                    } catch (e2) {
                        log(e2)
                    }
                }
                input = pickBestMatch(rec.couponInput)
            }
        }
        const applyBtn = pickBestMatch(rec.couponSubmit, input)
        if (!input || !_isVisible(input) || !applyBtn) {
            log('Input / apply button missing or hidden')
            log('AUTO_INSERT_ATTEMPT_END', code, {
                success: false,
                elapsed: performance.now() - attemptStart,
            })
            return { success: false, applied: false }
        }

        const hasPriceCfg = !!rec.priceContainer
        const original = hasPriceCfg
            ? getPrice(rec.priceContainer, { returnLargest: true })
            : NaN

        // Snapshot DOM signals BEFORE we apply, so we can compare after.
        const appliedSel = findAppliedSelector(rec)
        const beforeAppliedNodes = qAll(appliedSel).length
        const errorBaseline = snapshotErrorState(rec)

        /* 3] fill & apply — choose method dynamically:
             a) if applyBtn === input → auto-validate on input event
             b) if applyBtn is a button/element distinct → full pointer+click sequence
             c) Enter-key submit also dispatched as a fallback for forms

           Why a full pointer sequence and not just .click(): some Shopify themes
           (paragonsports-class) gate the apply on `pointerdown` rather than the
           click event. A bare .click() fires the click handler but not the
           pointer chain, so the site's own JS rejects it. This sequence makes
           the extension match what a real user click dispatches (pointerdown →
           pointerup → mousedown → mouseup → click). Sites that genuinely
           require event.isTrusted=true (olaplex / paleoonthego) still won't
           accept this — those are correctly flagged extension_compatible:false
           by the agent's HARD VALIDATION 2 step. */
        setInputValue(input, code)
        if (applyBtn !== input) {
            try {
                const r = applyBtn.getBoundingClientRect()
                const cx = r.x + r.width / 2
                const cy = r.y + r.height / 2
                const evtInit = {
                    bubbles: true,
                    cancelable: true,
                    clientX: cx,
                    clientY: cy,
                    view: window,
                    button: 0,
                }
                // Canonical browser ordering for a primary-pointer click:
                // pointerdown → mousedown → pointerup → mouseup → click.
                // The previous pd→pu→md→mu order broke React handlers on
                // Polaris-class checkouts (alwaystoast / skinnyfit / others
                // — verifier-validated codes silently dropped). Real-click
                // probe confirmed the UI accepts these codes when events fire
                // in canonical order.
                applyBtn.dispatchEvent(new PointerEvent('pointerdown', evtInit))
                applyBtn.dispatchEvent(new MouseEvent('mousedown', evtInit))
                applyBtn.dispatchEvent(new PointerEvent('pointerup', evtInit))
                applyBtn.dispatchEvent(new MouseEvent('mouseup', evtInit))
            } catch (_) {
                // Older browsers without PointerEvent constructor — fall through
                // to plain click which still works on most sites.
            }
            applyBtn.click()
        }
        // Always dispatch Enter on the input — harmless when no submit handler,
        // but lets sites that listen to keydown="Enter" pick it up.
        input.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true,
            }),
        )

        /* 4] wait for result — smart waiter: poll DOM up to 4s for the
             FIRST observable signal (success row appears OR error region
             gains text). Many sites (logos.com, hybris-style carts) need
             1.5-3s to render their applied row; fixed 1.2s sleeps cause
             the next attempt to mis-attribute the prior code's row. */
        async function waitForCartSignal(maxMs) {
            const baseSuccess = qAll(appliedSel).length
            // Use _firstVisibleErrorEl so multi-error-container sites
            // (paragonsports-class — empty placeholder + real error) aren't
            // permanently latched to the empty placeholder's "" baseline.
            const baseErrEl = _firstVisibleErrorEl(rec)
            const baseErr = baseErrEl ? (baseErrEl.innerText || '').trim() : ''
            const startedAt = performance.now()
            while (performance.now() - startedAt < maxMs) {
                const nowSuccess = qAll(appliedSel).length
                if (nowSuccess > baseSuccess) return 'committed'
                const errEl = _firstVisibleErrorEl(rec)
                if (errEl && _isVisible(errEl)) {
                    const t = (errEl.innerText || '').trim()
                    if (t.length && t !== baseErr) return 'errored'
                }
                await sleep(200)
            }
            return 'timeout-' + maxMs + 'ms'
        }
        let priceEl = null
        if (hasPriceCfg) {
            priceEl =
                qOne(rec.priceContainer) ||
                document.getElementById(
                    rec.priceContainer.match(/\[id=['"]([^'"]+)['"]\]/)?.[1] ||
                        '',
                )
        }
        // Polaris (Shopify) checkouts often respond in 5-8s for the apply
        // round-trip — 4s was clipping valid codes. Bumped to 10s; the loop
        // still races so a faster site exits as soon as a signal lands.
        const APPLY_WAIT_MS = 10000
        const waiters = [waitForCartSignal(APPLY_WAIT_MS)]
        // A price-watch timeout means "the total didn't change" — that's a
        // no-signal outcome, NOT a coupon error. Let it RESOLVE (swallow the
        // reject) so a failed apply falls through to the real committed / error-
        // text detection below, instead of aborting into the catch with a
        // synthetic "waitForTextChange timeout" errorMsg. That synthetic error
        // was being misread by the loop as a cart "signal" (sawSignal=true),
        // defeating the no-signal early-exit and making dead checkouts churn all
        // 8 codes (~80-100s) instead of bailing after ~2 (~20s).
        if (priceEl)
            waiters.push(
                waitForTextChange(priceEl, APPLY_WAIT_MS).catch(
                    () => 'price-nochange',
                ),
            )

        const via = await Promise.race(waiters)
        log('Wait finished via', via)

        // 5] Determine outcome:
        //   - committed = something visibly applied (DOM mutation)
        //   - stuck     = the row was still there 1.2s later (site didn't
        //                 auto-revert it). On no-priceContainer sites this
        //                 is the real "did it apply?" signal — sites like
        //                 logos.com keep an aria-live error region with
        //                 stale text that defeats errorMsg-based detection.
        //   - errorMsg  = error text appeared near input
        //   - savings   = price actually dropped
        const afterAppliedNodes = qAll(appliedSel).length
        const committed = afterAppliedNodes > beforeAppliedNodes
        let stuck = false
        if (committed) {
            await sleep(1200)
            const stuckCount = qAll(appliedSel).length
            stuck = stuckCount > beforeAppliedNodes
        }
        const errorMsg = detectCouponError(rec, errorBaseline, code)
        let newTotal = NaN
        let priceDropped = false
        if (hasPriceCfg) {
            newTotal = getPrice(rec.priceContainer, { returnLargest: true })
            priceDropped = !isNaN(newTotal) && newTotal < original
        }
        // Success rules (in priority order):
        //  1. price dropped                       → real win
        //  2. committed AND row stuck             → site accepted it (no
        //                                            need to trust the
        //                                            often-noisy error region)
        //  3. committed AND no errorMsg           → fallback for sites that
        //                                            don't keep their list mounted
        //  4. otherwise                           → fail
        const success =
            priceDropped || (committed && stuck) || (committed && !errorMsg)
        const elapsed = performance.now() - attemptStart
        log('AUTO_INSERT_ATTEMPT_END', code, {
            success,
            newTotal,
            committed,
            errorMsg,
            elapsed,
        })
        recordTiming('AUTO_INSERT_ATTEMPT_END', {
            code,
            success,
            newTotal,
            committed,
            errorMsg,
            elapsed,
        })
        return { success, newTotal, committed, errorMsg }
    } catch (err) {
        console.error('applyCoupon error', err)
        log('AUTO_INSERT_ATTEMPT_END', code, {
            success: false,
            error: String(err),
            elapsed: performance.now() - attemptStart,
        })
        recordTiming('AUTO_INSERT_ATTEMPT_END', {
            code,
            success: false,
            error: String(err),
            elapsed: performance.now() - attemptStart,
        })
        return { success: false, committed: false, errorMsg: String(err) }
    }
}

/* ----------------------------------------------  discount-link apply */
// Runtime CAPABILITY detection — no store lists, no config inspection. Some
// checkout stacks ignore ALL synthetic DOM interaction on their discount form
// (isTrusted-gated Apply buttons — proven live on two independent stores), but
// the same platform exposes, on the SAME origin the user is browsing:
//   GET /cart.js            -> live cart JSON (totals in cents, token)
//   GET /discount/{code}    -> attaches the code to the session server-side
// Any site that isn't that platform simply fails the /cart.js shape probe and
// the normal config-selector DOM flow below runs unchanged.
async function probeCartJson() {
    try {
        const r = await fetch('/cart.js', { credentials: 'same-origin' })
        if (!r.ok) return null
        const j = await r.json()
        if (
            j &&
            typeof j.token === 'string' &&
            typeof j.total_price === 'number' &&
            typeof j.item_count === 'number'
        )
            return j
    } catch (e) {
        /* not this platform — probe is expected to fail elsewhere */
    }
    return null
}
// Per-origin short-term memory of codes we already tried, so a navigation-type
// apply (full-page POST → reload, Magento-class) doesn't make the next run
// re-grind the same rejected codes from #1 — one wasted reload per code.
// sessionStorage is per-origin and per-tab and dies with the tab; entries also
// expire on their own after 15 minutes so fresh runs eventually retry.
const CARAMEL_TRIED_KEY = 'caramel_tried_codes'
const CARAMEL_TRIED_TTL = 15 * 60 * 1000
function _getTriedCodes() {
    try {
        const m = JSON.parse(sessionStorage.getItem(CARAMEL_TRIED_KEY) || '{}')
        const now = Date.now()
        for (const k of Object.keys(m)) {
            if (now - m[k] > CARAMEL_TRIED_TTL) delete m[k]
        }
        return m
    } catch (e) {
        return {}
    }
}
function _markTriedCode(code) {
    // Marked at attempt START, not at verdict — a full-page-POST apply can
    // destroy this script before the verdict lands.
    try {
        const m = _getTriedCodes()
        m[code] = Date.now()
        sessionStorage.setItem(CARAMEL_TRIED_KEY, JSON.stringify(m))
    } catch (e) {
        /* storage unavailable — worst case a reload retries codes */
    }
}
async function applyViaDiscountLink(code) {
    // The discount endpoint 302s to the storefront; we only need the session
    // cookie it sets, then re-read the live totals to see if the code took.
    // A later code simply replaces the session's discount, so probing several
    // codes leaves at most one (possibly ineffective) code attached — inert.
    try {
        await fetch('/discount/' + encodeURIComponent(code), {
            credentials: 'same-origin',
            redirect: 'follow',
        })
        return await probeCartJson()
    } catch (e) {
        return null
    }
}

/* --------------------------------------------------  coupon list */
async function fetchCoupons(site, kw, category) {
    // Delegate network fetch to background/service worker to avoid CORS failures
    const meta = { site, kw, category }
    try {
        log(
            'AUTO_INSERT_FETCHCOUPONS_START',
            Object.assign({}, meta, { t: performance.now() }),
        )
        recordTiming('AUTO_INSERT_FETCHCOUPONS_START', meta)
        const resp = await new Promise(res =>
            currentBrowser.runtime.sendMessage(
                { action: 'fetchCoupons', site, kw, category },
                res,
            ),
        )
        if (resp?.error) {
            log('fetchCoupons background error', resp.error)
            recordTiming('AUTO_INSERT_FETCHCOUPONS_END', {
                count: 0,
                error: resp.error,
            })
            throw new Error(resp.error)
        }
        const d = resp?.coupons || []
        log('AUTO_INSERT_FETCHCOUPONS_END', {
            count: d.length,
            t: performance.now(),
        })
        recordTiming('AUTO_INSERT_FETCHCOUPONS_END', { count: d.length })
        log('Fetched', d.length, 'coupons')
        return d
    } catch (e) {
        log('fetchCoupons error', e)
        recordTiming('AUTO_INSERT_FETCHCOUPONS_END', {
            count: 0,
            error: String(e),
        })
        throw e
    }
}
// Statuses that signal a coupon has restrictions the user might trip over.
// When ANY returned coupon carries one of these, we classify the cart so the
// UI can warn the user "your cart is X, this code is for Y."
const RESTRICTED_STATUSES = new Set([
    'product_restriction',
    'category_restricted',
    'seller_specific',
    'valid_with_warning',
])

async function classifyCartCategory() {
    try {
        const cs = window.CaramelCartSignals
        if (!cs || typeof cs.collectCartSignals !== 'function') return null
        const signals = await cs.collectCartSignals()
        const result = await new Promise(res =>
            currentBrowser.runtime.sendMessage(
                { action: 'classifyCart', signals },
                res,
            ),
        )
        if (result && result.primary && !result.error) {
            log(
                'Cart category:',
                result.primary,
                '(conf:',
                result.confidence,
                ')',
            )
            return {
                primary: result.primary,
                secondary: result.secondary,
                confidence: result.confidence,
            }
        }
    } catch (e) {
        log('classifyCart non-fatal error', e)
    }
    return null
}

async function getCoupons(rec) {
    let kw = ''
    // Dev hook: deterministic coupons when using #caramel-test. Gated to
    // unpacked dev installs so a #caramel-test link can't make the packed
    // production build fire mock codes against a real store's checkout.
    if (
        _isDevInstall() &&
        location.hash &&
        location.hash.includes('caramel-test')
    ) {
        log('DEV MODE: returning mocked coupons')
        return [{ code: 'TEST10' }, { code: 'TEST20' }, { code: 'TEST30' }]
    }

    // 1) Use the codes already fetched at detection time (cached) — falls back
    //    to a fresh fetch if the cache is cold. Avoids a double network call.
    const list = await getCachedCodes(rec)

    // 2) Only classify the cart if any returned coupon is flagged as restricted
    //    — that's when the category meaningfully helps the user decide.
    const hasRestricted = (list || []).some(c =>
        RESTRICTED_STATUSES.has(c.status),
    )
    if (!hasRestricted) {
        log(
            `getCoupons: ${list?.length || 0} coupons, none restricted — skipping classify-cart`,
        )
        return list
    }
    log(
        `getCoupons: restricted coupon(s) present — classifying cart for insights`,
    )
    const cat = await classifyCartCategory()
    // 3) Annotate restricted coupons with cart category so the popup can render
    //    a contextual "may not apply — your cart is X" hint.
    if (cat?.primary) {
        return list.map(c =>
            RESTRICTED_STATUSES.has(c.status)
                ? {
                      ...c,
                      cartCategory: cat.primary,
                      cartCategorySecondary: cat.secondary,
                  }
                : c,
        )
    }
    return list
}

/* --------------------------------------------------  main runner */
// Set true when the user dismisses the testing overlay, so the loop stops
// instead of trapping them. Shared across content-script files (same realm).
// Guarded `var` (matches this file's re-injection convention — see sleep/log)
// so a second content-script injection doesn't throw on redeclaration.
if (typeof _caramelCancelled === 'undefined') {
    var _caramelCancelled = false
}
async function startApplyingCoupons(rec) {
    log('=== Starting coupon flow ===')
    if (!rec) {
        // No store config (unsupported host / lookup failed). Degrade cleanly
        // instead of throwing mid-flow behind the overlay.
        log('AUTO_INSERT_STOP', { result: 'no-domain-record' })
        showFinalModal(0, null, "We don't have codes for this store yet.")
        return
    }
    log('AUTO_INSERT_START', { domain: rec.domain, t: performance.now() })
    _caramelCancelled = false
    await showTestingModal()

    let coupons
    try {
        coupons = await getCoupons(rec)
    } catch (e) {
        log('AUTO_INSERT_STOP', {
            result: 'coupon-fetch-failed',
            error: String(e),
            t: performance.now(),
        })
        showFinalModal(
            0,
            null,
            "Couldn't load codes right now — give it another go in a moment.",
        )
        return
    }
    if (!Array.isArray(coupons) || !coupons.length) {
        log('AUTO_INSERT_STOP', { result: 'no-coupons', t: performance.now() })
        showFinalModal(
            0,
            null,
            "No codes for this store just yet — we're working on it.",
        )
        return
    }

    // Skip codes this tab already tried recently (navigation-type applies
    // reload the page mid-loop; without this a re-run restarts from code #1).
    const _tried = _getTriedCodes()
    const _untried = coupons.filter(c => !(c.code in _tried))
    if (_untried.length < coupons.length) {
        log('AUTO_INSERT_SKIP_TRIED', {
            skipped: coupons.length - _untried.length,
        })
    }
    if (!_untried.length) {
        log('AUTO_INSERT_STOP', { result: 'all-tried', t: performance.now() })
        showFinalModal(
            0,
            null,
            'We already tried these codes on this page — copy one below to use manually, or check back later for fresh codes.',
            false,
            coupons,
        )
        return
    }
    coupons = _untried

    // Discount-link strategy first when the platform capability is present
    // (see probeCartJson). On these checkouts the DOM form is deaf to
    // synthetic events, while the link path is fast (~0.5s/code, no page
    // freeze), measurable (live totals), and works even when the coupon UI
    // lives behind an untrusted-click gate.
    const _cart0 = await probeCartJson()
    if (_cart0 && _cart0.item_count > 0) {
        log('AUTO_INSERT_STRATEGY', {
            via: 'discount-link',
            total: _cart0.total_price,
        })
        const linkCodes = coupons.slice(0, 8)
        for (let i = 0; i < linkCodes.length; i++) {
            if (_caramelCancelled) {
                log('AUTO_INSERT_STOP', {
                    result: 'cancelled',
                    t: performance.now(),
                })
                return
            }
            const { code } = linkCodes[i]
            await updateTestingModal(i + 1, linkCodes.length, code)
            _markTriedCode(code)
            const after = await applyViaDiscountLink(code)
            if (after && after.total_price < _cart0.total_price) {
                const saved = (_cart0.total_price - after.total_price) / 100
                log('AUTO_INSERT_STOP', {
                    result: 'applied',
                    via: 'discount-link',
                    bestCode: code,
                    bestSave: saved,
                    t: performance.now(),
                })
                // Reload so the page's own UI shows the applied discount
                // (tag + new total), then re-show our result on the fresh
                // document — sessionStorage survives same-tab reloads and is
                // per-origin, so the handoff can't leak across sites.
                try {
                    sessionStorage.setItem(
                        'caramel_applied',
                        JSON.stringify({
                            code,
                            saved,
                            currency: after.currency,
                            t: Date.now(),
                        }),
                    )
                } catch (e) {
                    /* storage blocked — the discount is still applied */
                }
                location.reload()
                return
            }
        }
        log('AUTO_INSERT_STOP', {
            result: 'none',
            via: 'discount-link',
            tried: linkCodes.map(c => c.code),
            t: performance.now(),
        })
        // None of the codes moved the total — hand them over to copy instead
        // of also grinding the (deaf) DOM form.
        showFinalModal(0, null, null, false, coupons)
        return
    }

    // Before pretending to "try" codes, confirm the promo box is actually
    // reachable on this page. If the config's selectors don't match (stale
    // config, or the box lives on a later checkout step), say so honestly and
    // hand over the codes to copy — instead of churning through 8 codes against
    // nothing and then showing a misleading "didn't stick" message.
    // Visibility-aware: a box that exists but sits inside a collapsed
    // accordion (Magento-class carts) is as unusable as a missing one — reveal
    // it via showInput up front so the whole loop runs against a box the user
    // can actually SEE, and wait for visibility, not mere presence.
    let _box = pickBestMatch(rec.couponInput)
    if ((!_box || !_isVisible(_box)) && rec.showInput) {
        const _toggle = pickBestMatch(rec.showInput, _box)
        if (_toggle) {
            _toggle.click()
            try {
                await waitForVisible(rec.couponInput, 2500)
            } catch (e) {
                // late-bound accordion widgets can miss the first click
                _toggle.click()
                try {
                    await waitForVisible(rec.couponInput, 1500)
                } catch (e2) {
                    /* box still didn't appear */
                }
            }
            _box = pickBestMatch(rec.couponInput)
        }
    }
    if (!_box || !_isVisible(_box)) {
        log('AUTO_INSERT_STOP', {
            result: 'no-coupon-box',
            t: performance.now(),
        })
        showFinalModal(
            0,
            null,
            "We couldn't find the promo box on this page — copy a code below and paste it where the store asks for a promo code.",
            false,
            coupons,
        )
        return
    }

    // Cap attempts to a reasonable number to limit runtime
    const MAX_ATTEMPTS = 8
    if (coupons.length > MAX_ATTEMPTS) coupons = coupons.slice(0, MAX_ATTEMPTS)

    const hasPriceCfg = !!rec.priceContainer
    const original = hasPriceCfg
        ? getPrice(rec.priceContainer, { returnLargest: true })
        : NaN
    let bestSave = 0
    let bestCode = null
    let lastStoreReason = null // last real error text the store showed us
    const triedCodes = []
    // Pattern-based early-exit: if the checkout gives ZERO feedback (no applied
    // row, no error text) for the first couple of codes, it isn't accepting our
    // injected input at all — stop probing instead of freezing the page ~10s ×
    // every code. Checks DOM *signals*, never the config's content.
    const EARLY_PROBE = 2
    let sawSignal = false

    // Wall-clock backstop. The no-signal early-exit above can't help a checkout
    // that stays *responsive* — one that hands back a real "invalid code" error
    // for every code (sawSignal=true) — so without this it would churn all 8
    // codes at ~10s each and trap the user behind the "Applying…" overlay for
    // 80-100s. Once this budget is spent with nothing applied, stop and hand the
    // remaining codes over to copy. A VALID code still wins instantly (success
    // breaks the loop below), so this only ever trims trailing *failing* tries.
    // Time-based, never store-specific.
    const FLOW_BUDGET_MS = 35000
    const loopStart = performance.now()

    for (let i = 0; i < coupons.length; i++) {
        if (_caramelCancelled) break
        if (!bestCode && performance.now() - loopStart > FLOW_BUDGET_MS) {
            log('AUTO_INSERT_TIME_BUDGET', {
                tried: i,
                elapsed: performance.now() - loopStart,
            })
            break
        }
        const { code } = coupons[i]
        triedCodes.push(code)
        await updateTestingModal(i + 1, coupons.length, code)

        _markTriedCode(code)
        const res = await applyCoupon(code, rec)

        // Late-total safety net: some checkouts (erincondren-class) flash their
        // error region a beat BEFORE the order total re-renders, so applyCoupon
        // can measure "no drop" and rule a code failed even though it actually
        // stuck. Left uncaught, that applied-but-unrecognised coupon then
        // poisons every later attempt (whose baseline is now the discounted
        // price) and the run ends "nothing applied" while a discount sits on
        // the cart. So: if a coupon row is now showing, poll briefly for the
        // LIVE total to fall below the cart's ORIGINAL total; if it does, this
        // code really worked — credit it and stop. Gated on an applied row +
        // price config, so invalid codes (no row) add no time.
        if (!res.success && hasPriceCfg && !isNaN(original)) {
            const appliedNow = () =>
                qAll(findAppliedSelector(rec)).some(el => _isVisible(el))
            if (appliedNow()) {
                for (let t = 0; t < 4; t++) {
                    await sleep(400)
                    const cur = getPrice(rec.priceContainer, {
                        returnLargest: true,
                    })
                    if (!isNaN(cur) && cur < original - 0.01) {
                        res.success = true
                        res.newTotal = cur
                        res.committed = true
                        break
                    }
                }
            }
        }

        if (res.success) {
            // Real success — keep this code applied, stop here.
            const diff =
                hasPriceCfg && !isNaN(res.newTotal)
                    ? original - res.newTotal
                    : 0
            log(`✓ ${code} saved ${diff || '(unknown — no priceContainer)'}`)
            bestSave = diff
            bestCode = code
            break
        }

        // Apply FAILED. Decide what cleanup is needed before next attempt:
        //   - If the cart visibly accepted the code (`committed`) but an error
        //     showed up → remove that pending coupon so the next try starts
        //     from a clean cart.
        //   - If nothing committed → just clear the input field so the next
        //     try doesn't append to leftover text.
        //   - Either way, then move on to the next code.
        log(`✗ ${code} failed`, {
            committed: res.committed,
            errorMsg: res.errorMsg,
        })
        // Keep the store's own words (login-required, min-spend, expired…) so
        // the final modal can say the REAL reason instead of a generic line.
        if (
            res.errorMsg &&
            typeof res.errorMsg === 'string' &&
            !/timeout/i.test(res.errorMsg)
        ) {
            lastStoreReason = res.errorMsg
        }
        if (res.committed) {
            await removeAppliedCoupon(rec)
        } else {
            const inp = pickBestMatch(rec.couponInput)
            if (inp && inp.value) {
                setInputValue(inp, '')
            }
        }
        // A committed row or an error message means the checkout IS reacting to
        // us — keep going. Zero signal after EARLY_PROBE codes means it isn't.
        if (res.committed || res.errorMsg) sawSignal = true
        if (!sawSignal && i + 1 >= EARLY_PROBE) {
            log('AUTO_INSERT_EARLY_EXIT', {
                tried: i + 1,
                reason: 'no cart signal — checkout not accepting injection',
                t: performance.now(),
            })
            break
        }
        await waitUntilReady(rec)
        await sleep(160) // tiny visual pause between tries
    }

    if (_caramelCancelled) {
        log('AUTO_INSERT_STOP', { result: 'cancelled', t: performance.now() })
        return
    }

    if (bestCode) {
        // bestCode was already applied during the successful loop iteration.
        // Do NOT re-apply — would double-stack on sites that don't dedupe.
        log('AUTO_INSERT_STOP', {
            result: 'applied',
            bestCode,
            bestSave,
            tried: triedCodes,
            t: performance.now(),
        })
        // A committed code that didn't move a READABLE total is usually a
        // threshold promo (min-spend) — say so instead of a bare "applied".
        const zeroEffect = hasPriceCfg && !isNaN(original) && !(bestSave > 0)
        showFinalModal(
            bestSave,
            bestCode,
            zeroEffect
                ? `Code ${bestCode} is on your cart but hasn't changed the total yet — it may need a minimum spend to kick in.`
                : null,
        )
    } else {
        log('AUTO_INSERT_STOP', {
            result: 'none',
            bestCode: null,
            bestSave: 0,
            tried: triedCodes,
            t: performance.now(),
        })
        // Nothing auto-applied. Hand the tried codes to the modal so the user
        // gets a manual copy/paste fallback (covers valid codes the store's
        // checkout rejected only because our synthetic click isn't trusted).
        // When the store told us WHY (login required, min spend, expired…),
        // repeat its own words — that's the honest, transparent version.
        showFinalModal(
            0,
            null,
            lastStoreReason
                ? `The store said: “${String(lastStoreReason).slice(0, 140)}” — copy a code below to try it manually.`
                : null,
            false,
            coupons,
        )
    }
}

/* --------------------------------------------------  listeners
 * Guard: register once per realm. Without this, SPA re-injections stack
 * duplicate listeners → double-fires, memory leaks. */
if (!window.__caramel_listeners_bound) {
    window.__caramel_listeners_bound = true

    window.addEventListener('message', ev => {
        if (!CARAMEL_ALLOWED_ORIGINS.has(ev.origin)) return
        if (ev.data?.token) {
            currentBrowser.storage.sync.set(
                {
                    token: ev.data.token,
                    user: {
                        username: ev.data.username || 'CaramelUser',
                        image: ev.data.image,
                    },
                },
                tryInitialize,
            )
        }
    })
    currentBrowser.runtime.onMessage.addListener((req, _s, send) => {
        if (req.action === 'userLoggedIn') {
            log('AUTO_INSERT_TRIGGERED_BY_MESSAGE', { t: performance.now() })
            // Fire-and-forget: an async listener returns a Promise (not `true`),
            // so Chrome would close the channel before a post-await send(). Reply
            // immediately and run the long apply flow detached.
            getDomainRecord(location.hostname)
                .then(rec => startApplyingCoupons(rec))
                .catch(err => {
                    console.error('Caramel: apply flow error', err)
                    hideTestingModal()
                })
            send({ success: true })
            return false
        }
    })
}
