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
    var log = (...a) => console.log('Caramel:', ...a)
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

const CARAMEL_ALLOWED_ORIGINS = new Set([
    'http://localhost:58300',
    'https://grabcaramel.com',
    'https://dev.grabcaramel.com',
])

/* ---------- DOM waiters ---------- */
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
function waitForAmazonFetch() {
    return new Promise(resolve => {
        const orig = window.fetch
        window.fetch = (...args) => {
            const [url] = args
            const p = orig(...args)
            if (url.includes('/apply-discount')) {
                p.finally(() => {
                    window.fetch = orig
                    resolve('network-reply')
                })
            }
            return p
        }
    })
}

/* ---------- Amazon helpers (fast scrape without opening a new tab) ---------- */
async function getAmazonCartKeywords() {
    try {
        // 1) try to read from current DOM
        const titles = Array.from(
            document.querySelectorAll('.sc-product-title'),
        )
            .map(el => el.textContent.trim())
            .filter(Boolean)
        if (titles.length) return titles

        // 2) fetch cart HTML same-origin (keeps cookies)
        const r = await fetch('/gp/cart/view.html?ref_=nav_cart', {
            credentials: 'include',
        })
        if (!r.ok) return []
        const html = await r.text()
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const fetched = Array.from(doc.querySelectorAll('.sc-product-title'))
            .map(el => el.textContent.trim())
            .filter(Boolean)
        return fetched
    } catch (e) {
        log('getAmazonCartKeywords error', e)
        return []
    }
}

/* ---------- UI readiness helper (new) ---------- */
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
    return getDomainRecord.cache?.find(r => domain.includes(r.domain))
}
getDomainRecord.cache = null

/* --------------------------------------------------  checkout detector */
async function isCheckout() {
    const rec = await getDomainRecord(location.hostname)
    if (!rec) return false
    if (qOne(rec.couponInput) || qOne(rec.showInput)) return true
    try {
        await waitForElement(`${rec.couponInput},${rec.showInput}`, 3000)
    } catch (e) {
        log(e)
    }
    return !!(qOne(rec.couponInput) || qOne(rec.showInput))
}

/* --------------------------------------------------  init hook */
async function tryInitialize() {
    if (await isCheckout()) {
        const rec = await getDomainRecord(location.hostname)
        await insertCaramelPrompt(rec)
    }
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
    const candidates = [...document.querySelectorAll(sel)].filter(
        b => b.offsetParent !== null && !b.disabled,
    )
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
function snapshotErrorState(rec) {
    // Capture the error region's text + visibility BEFORE we apply, so we can
    // tell whether an error appeared *because of this attempt* vs. a stale
    // error container that some sites keep mounted (aria-live regions,
    // placeholder error rows, etc.). Without this snapshot the extension
    // would treat permanently-mounted empty error containers as "error
    // present" and loop forever even after a valid coupon applied.
    if (!rec.errorIndicator) return { text: '', visible: false }
    const el = qOne(rec.errorIndicator)
    if (!el) return { text: '', visible: false }
    return {
        text: (el.innerText || '').trim(),
        visible: el.offsetParent !== null,
    }
}

function detectCouponError(rec, baseline) {
    // baseline is what snapshotErrorState() returned BEFORE the apply.
    // We only call something an "error" if the state CHANGED — first
    // appearance, or text changed (e.g. now mentions the failed code).
    if (rec.errorIndicator) {
        const el = qOne(rec.errorIndicator)
        if (el && el.offsetParent !== null) {
            const t = (el.innerText || '').trim()
            if (t.length) {
                if (!baseline) return t // back-compat, no snapshot
                const wasVisible = baseline.visible
                const wasText = baseline.text
                // Treat as a real error only when:
                //   - text appeared (was empty, now has content), OR
                //   - text actually changed (new error string), OR
                //   - element became visible (was hidden, now shown)
                if (
                    (!wasVisible && el.offsetParent !== null) ||
                    t !== wasText
                ) {
                    return t
                }
                // Same text + same visibility = stale container, ignore.
                return null
            }
        }
    }
    // Generic: look near the input for an inline error matching common phrases.
    const input = qOne(rec.couponInput)
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

        /* 2] ensure input visible */
        let input = qOne(rec.couponInput)
        if (!input && rec.showInput) {
            const showBtn = qOne(rec.showInput)
            if (showBtn) {
                showBtn.click()
                try {
                    await waitForElement(rec.couponInput, 3000)
                } catch (e) {
                    log(e)
                }
                input = qOne(rec.couponInput)
            }
        }
        const applyBtn = qOne(rec.couponSubmit)
        if (!input || !applyBtn) {
            log('Input / apply button missing')
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
             b) if applyBtn is a button/element distinct → click
             c) Enter-key submit also dispatched as a fallback for forms */
        setInputValue(input, code)
        if (applyBtn !== input) {
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

        /* 4] wait for result */
        const waiters = [sleep(1200).then(() => 'timeout-1.2s')]
        let priceEl = null
        if (hasPriceCfg) {
            priceEl =
                qOne(rec.priceContainer) ||
                document.getElementById(
                    rec.priceContainer.match(/\[id=['"]([^'"]+)['"]\]/)?.[1] ||
                        '',
                )
        }
        if (priceEl && rec.domain !== 'amazon.com')
            waiters.push(waitForTextChange(priceEl, 3000))
        if (rec.domain === 'amazon.com') waiters.push(waitForAmazonFetch())

        const via = await Promise.race(waiters)
        log('Wait finished via', via)

        // 5] Determine outcome:
        //   - committed = something visibly applied (DOM mutation)
        //   - errorMsg = error text appeared near input
        //   - savings = price actually dropped
        const afterAppliedNodes = qAll(appliedSel).length
        const committed = afterAppliedNodes > beforeAppliedNodes
        const errorMsg = detectCouponError(rec, errorBaseline)
        let newTotal = NaN
        let priceDropped = false
        if (hasPriceCfg) {
            newTotal = getPrice(rec.priceContainer, { returnLargest: true })
            priceDropped = !isNaN(newTotal) && newTotal < original
        }
        // Success rules (in priority order):
        //  1. price dropped → real win
        //  2. committed AND no error → likely worked, treat as success
        //  3. otherwise → fail
        const success = priceDropped || (committed && !errorMsg)
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
    if (rec.domain === 'amazon.com') {
        recordTiming('AUTO_INSERT_AMAZON_SCRAPE_REQUEST')
        const titles = await getAmazonCartKeywords()
        recordTiming('AUTO_INSERT_AMAZON_SCRAPE_RESPONSE', {
            count: titles.length,
        })
        kw = (titles || []).join(',')
        log('Amazon keywords', kw)
    }

    // Dev hook: deterministic coupons when using #caramel-test
    if (location.hash && location.hash.includes('caramel-test')) {
        log('DEV MODE: returning mocked coupons')
        return [{ code: 'TEST10' }, { code: 'TEST20' }, { code: 'TEST30' }]
    }

    // 1) Fetch coupons FIRST — no LLM call yet.
    const list = await fetchCoupons(rec.domain, kw, '')

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
async function startApplyingCoupons(rec) {
    log('=== Starting coupon flow ===')
    log('AUTO_INSERT_START', { domain: rec?.domain, t: performance.now() })
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
        showFinalModal(0, null, 'Network error fetching coupons')
        return
    }
    if (!Array.isArray(coupons) || !coupons.length) {
        log('AUTO_INSERT_STOP', { result: 'no-coupons', t: performance.now() })
        showFinalModal(
            0,
            null,
            'No coupons available for this store right now.',
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
    const triedCodes = []

    for (let i = 0; i < coupons.length; i++) {
        const { code } = coupons[i]
        triedCodes.push(code)
        await updateTestingModal(i + 1, coupons.length, code)

        const res = await applyCoupon(code, rec)

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
        if (res.committed) {
            await removeAppliedCoupon(rec)
        } else {
            const inp = qOne(rec.couponInput)
            if (inp && inp.value) {
                setInputValue(inp, '')
            }
        }
        await waitUntilReady(rec)
        await sleep(160) // tiny visual pause between tries
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
        const headline =
            hasPriceCfg && bestSave > 0
                ? 'We found a coupon that saves you money!'
                : `Applied ${bestCode}`
        showFinalModal(bestSave, bestCode, headline)
    } else {
        log('AUTO_INSERT_STOP', {
            result: 'none',
            bestCode: null,
            bestSave: 0,
            t: performance.now(),
        })
        showFinalModal(0, null, 'Already the best price.')
    }
}

/* --------------------------------------------------  listeners (unchanged) */
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
currentBrowser.runtime.onMessage.addListener(async (req, _s, send) => {
    if (req.action === 'userLoggedIn') {
        log('AUTO_INSERT_TRIGGERED_BY_MESSAGE', { t: performance.now() })
        const rec = await getDomainRecord(location.hostname)
        await startApplyingCoupons(rec)
        send({ success: true })
    }
})
