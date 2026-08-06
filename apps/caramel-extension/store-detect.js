// owns: supported-store cache, checkout detection, init hook (STORE_CACHE_*, _getCacheTtl, getDomainRecord, _hostMatchesDomain, isCheckout, getCachedCodes, tryInitialize, startCheckoutDetection). NOT _isDevInstall — see F-008 note below.
// load after: caramel-base.js, dom-utils.js
//
// F-008 note: _isDevInstall used to live here (this file owns the rest of
// "dev-install detection" conceptually) but was relocated to
// caramel-base.js — that file's own top-level code calls it immediately at
// load time and needs it defined before that runs (same-script hoisting
// covered this when everything was one file; separate files don't hoist
// backward across each other). _getCacheTtl() below still calls it, from
// inside a function body (deferred), so it doesn't care that the
// definition now lives in an earlier-loading file instead of this one.

/* --------------------------------------------------  config cache */
const STORE_CACHE_KEY = 'caramel_supported_stores'
const STORE_CACHE_PROD_TTL = 60 * 60 * 1000 // 1 hour
const STORE_CACHE_DEV_TTL = 0 // bypass cache when loaded as unpacked dev extension

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
        } catch {
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
            } catch {
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
// Hyphen-joined checkout hosts are real (`secure-athleta.gap.com` serves
// `athleta.gap.com`'s checkout) but a bare "any prefix + '-'" rule also lets
// an ATTACKER-registered `evil-target.com` inherit `target.com`'s selectors
// and coupons. Every genuine hyphen host in the catalog is a known checkout
// prefix in front of a domain that already has its own subdomain, so require
// BOTH: an allow-listed prefix label, and a domain of 3+ labels. That admits
// every real case (`secure-{athleta,oldnavy,bananarepublic,…}.<brand>.<tld>`)
// while `evil-target.com` → `target.com` (2 labels, unknown prefix) is out.
const HYPHEN_CHECKOUT_PREFIXES = new Set([
    'secure',
    'checkout',
    'www',
    'shop',
    'store',
])
/* A Shopify store's own checkout can live on its <shop>.myshopify.com host
 * rather than on the brand domain. 5starnutritionusa.com does exactly this
 * (QA sweep 2026-08-05): the shopper adds $44.99, hits checkout, lands on
 * 5starnutritionusa.myshopify.com — and the extension goes dark at the one
 * moment it matters, because the config's domain is the brand host and no
 * suffix rule connects the two. No coupon fetch happens at all.
 *
 * Matched on the shop LABEL equalling the config domain's first label, which
 * is how a store's myshopify host is named when it maps to its brand domain.
 * Deliberately narrow: the suffix is the fixed, Shopify-owned `myshopify.com`,
 * so this cannot be used to inherit another store's config the way a bare
 * "any prefix" rule could — nobody can register `target.myshopify.com` and
 * become target.com without Shopify handing them that shop name.
 *
 * Stores whose shop name does NOT match their brand label (naturepedic's is
 * `0vjjgk-zp.myshopify.com`) are not helped by this and still need their own
 * catalogue row; this fixes the aligned majority, not every case.
 */
const CARAMEL_SHOPIFY_HOST_SUFFIX = '.myshopify.com'
function _shopifyShopHostMatches(host, domain) {
    if (!host.endsWith(CARAMEL_SHOPIFY_HOST_SUFFIX)) return false
    const shop = host.slice(0, -CARAMEL_SHOPIFY_HOST_SUFFIX.length)
    // One label only: `a.b.myshopify.com` is not a shop host.
    if (!shop || shop.includes('.')) return false
    const brandLabel = domain.split('.')[0]
    return !!brandLabel && shop === brandLabel
}

function _hostMatchesDomain(host, domain) {
    if (!host || !domain) return false
    host = String(host).toLowerCase()
    domain = String(domain).toLowerCase()
    if (host === domain) return true
    if (_shopifyShopHostMatches(host, domain)) return true
    const i = host.length - domain.length
    if (i <= 0) return false
    if (host.slice(i) !== domain) return false
    const sep = host[i - 1]
    if (sep === '.') return true
    if (sep !== '-') return false
    return (
        HYPHEN_CHECKOUT_PREFIXES.has(host.slice(0, i - 1)) &&
        domain.split('.').length >= 3
    )
}

/* --------------------------------------------------  checkout detector */

/* Does this URL name a cart or checkout? Generic across platforms — a word in
 * the path, never a store-specific rule. Used only to decide whether a live
 * cart probe is worth making, so a miss costs nothing but a missed probe.
 * `bag` is deliberately absent: /collections/bag is a product category on a
 * great many stores, and the prompt has no business appearing there. */
const CARAMEL_CART_PATH_RE =
    /(?:^|[/\-_])(cart|carts|basket|checkout|checkouts)(?:[/\-_?#]|$)/i

/* Can we act here even though no promo box matched?
 *
 * The DOM check above asks whether the CONFIG matches this page. That is the
 * wrong question on a platform whose cart we can read and drive over the
 * network: the discount-link path (coupon-runner.js) needs no promo box at all,
 * and applies codes perfectly well on pages where the config's selectors — very
 * often written against the checkout, not the cart — match nothing.
 *
 * The 2026-08-05 QA sweep measured what that costs: roughly half the catalogue
 * (~1,300 stores) carries a checkout-only coupon selector, so a shopper sitting
 * on the cart page of a store WITH codes in our database sees nothing at all.
 * Silence on a store that has coupons is the defect the owner named directly.
 *
 * So gate on CAPABILITY rather than configuration: a live cart with something
 * in it means we can genuinely help here. Probed only on a cart-ish URL, so an
 * ordinary product page never pays for the request.
 */
async function _platformCartUsable() {
    if (!CARAMEL_CART_PATH_RE.test(location.pathname + location.search))
        return false
    try {
        const cart = await probeCartJson()
        if (cart && cart.item_count > 0) {
            log('CHECKOUT_VIA_CART_PAYLOAD', {
                items: cart.item_count,
                reason: 'no promo box matched, but the platform cart is readable and non-empty',
            })
            return true
        }
    } catch (e) {
        log('CART_PROBE_FAILED', { error: String(e) })
    }
    return false
}

async function isCheckout() {
    const rec = await getDomainRecord(location.hostname)
    if (!rec) return false
    // VISIBLE, not merely present: themes ship hidden coupon markup on
    // non-checkout pages, and some configs point showInput at site-wide
    // controls — the prompt belongs only where the user can actually see a
    // way to enter a code. Same semantics as the re-detection observer.
    //
    // caramelCouponAnchors rather than a raw visibility scan: a selector that
    // matches hundreds of visible elements is not describing a promo box, and
    // answering "yes, a checkout" from one puts the prompt on every page of the
    // site (see its comment for the measured case).
    const anyVisible = () =>
        [rec.couponInput, rec.showInput]
            .filter(Boolean)
            .some(sel => caramelCouponAnchors(sel).length > 0)
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
    if (anyVisible()) return true
    // A promo box the shopper can open in one tap is not a hidden box — it is a
    // closed drawer. Offering help there is the whole point; the apply flow
    // opens the same disclosure before it types (see caramelDisclosureFor for
    // the two stores that measured this, one of them at 1440 wide).
    const _hiddenBox = rec.couponInput ? pickBestMatch(rec.couponInput) : null
    if (_hiddenBox && caramelDisclosureFor(_hiddenBox)) {
        log('CHECKOUT_VIA_DISCLOSURE', {
            reason: 'the promo box is present behind a disclosure the shopper can open',
        })
        return true
    }
    return await _platformCartUsable()
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
    } catch {
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

/* Finish an attempt the page interrupted by navigating (see
 * caramelMarkPendingSubmit in dom-utils.js for the 1800petmeds case this
 * exists for: a real $14.78 won, and 180 seconds of silence).
 *
 * The record says only which code was submitted and what the prices were
 * beforehand. Whether it WORKED is measured here, on the page the store just
 * served, so every outcome below is read off the live document:
 *
 *   total dropped        → a real, measured win: bank it and say so
 *   total didn't drop    → say that plainly, and hand over the other codes
 *   nothing readable     → say we can't tell, and point at the order summary
 *
 * The third case is the one worth being strict about. It is tempting to treat
 * "we submitted a code and the page reloaded" as success — that is exactly how
 * a tool starts claiming savings its user never got. Silence was the bug;
 * inventing a number would be a worse one.
 *
 * Returns true when it handled the page (a modal is up), false to continue with
 * normal checkout detection.
 */
async function _resumePendingSubmit() {
    const pending = caramelTakePendingSubmit()
    if (!pending) return false
    const rec = await getDomainRecord(location.hostname)
    const now =
        rec && rec.priceContainer
            ? getPrice(rec.priceContainer, { returnLargest: true })
            : NaN
    // Same tightest-defensible-baseline rule the in-page path uses, against the
    // prices captured before the submit — it can never overstate a saving.
    const baseline = caramelBaselineFor(now, pending.prices)
    const saved =
        Number.isFinite(now) && Number.isFinite(baseline) ? baseline - now : NaN
    const measured = Number.isFinite(saved) && saved > 0

    log('AUTO_INSERT_RESUMED', {
        code: pending.code,
        measured,
        saved: measured ? saved : null,
        readable: Number.isFinite(now),
    })

    if (measured) {
        reportOutcome(pending.id, 'worked')
        caramelRecordSaving({
            domain: location.hostname,
            code: pending.code,
            amount: saved,
            currency: caramelCurrencyCode(),
        })
        showFinalModal(saved, pending.code)
        return true
    }

    // Not a win. Deliberately NOT reported as a coupon failure: the page
    // navigating out from under us says nothing about the code, and the runner
    // holds the same line — only the store's own rejection words count.
    let others = []
    try {
        if (rec) others = await getCachedCodes(rec)
    } catch {
        /* no code list to offer — the message below still stands on its own */
    }
    if (Number.isFinite(now)) {
        // We could read the total and it did not move.
        showFinalModal(
            0,
            null,
            `We submitted ${pending.code} before the page reloaded, but your total hasn't changed — copy another code below to try it yourself.`,
            false,
            others.filter(
                c =>
                    String(c && c.code).toUpperCase() !==
                    pending.code.toUpperCase(),
            ),
        )
    } else {
        showFinalModal(
            0,
            null,
            `We submitted ${pending.code} just before the page reloaded — check your order summary to see whether it applied.`,
            false,
            others,
        )
    }
    return true
}

/* Entry point. Beyond the one-shot load check, KEEP WATCHING: on SPA / drawer-
   cart stores (allsaints and most SFCC/Shopify sites) the coupon field is
   injected only when the user opens the bag/cart — with no page navigation, so
   a load-time check finds nothing and the user sees nothing even though the
   promo box is right there. Re-detect it: observe the DOM and show the prompt
   the moment the coupon field appears. Debounced + self-disconnects after it
   fires once, so it costs ~nothing and never nags. */
// Called from inject.js (see UI-helpers.js's insertCaramelPrompt for why
// per-file analysis misses cross-file content-script calls).
// oxlint-disable-next-line no-unused-vars
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
                // Discount-link wins reload the page before extension
                // storage can be written safely — record the saving here,
                // on the fresh document, from the sessionStorage handoff.
                caramelRecordSaving({
                    domain: location.hostname,
                    code: st.code,
                    amount: st.saved || 0,
                    currency: st.currency || 'USD',
                })
                let amount = st.saved || 0
                let msg = null
                if (st.currency && st.currency !== 'USD' && amount > 0) {
                    // No price has been read on this freshly-reloaded page, so
                    // tell the UI the currency the saving was recorded in.
                    // Only then does the headline amount render as "£8.00".
                    let symbolKnown = false
                    try {
                        const sym = new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: st.currency,
                        })
                            .formatToParts(amount)
                            .find(p => p.type === 'currency')?.value
                        symbolKnown = caramelSetCurrencySymbol(sym)
                        if (!symbolKnown) {
                            // Symbol we can't render in the headline (e.g.
                            // "CA$", "R$"). Fall back to the applied-code
                            // presentation, which states the formatted amount
                            // in words rather than mislabelling it as "$".
                            msg = `Code ${st.code} saved you ${new Intl.NumberFormat(
                                undefined,
                                { style: 'currency', currency: st.currency },
                            ).format(amount)} — it's applied to your order.`
                            amount = 0
                        }
                    } catch {
                        /* unknown currency code — fall back to $ */
                    }
                }
                showFinalModal(amount, st.code, msg)
                return
            }
        }
    } catch {
        /* sessionStorage unavailable — continue with normal detection */
    }
    // An attempt the store's own form POST cut short finishes here, on the page
    // that replaced it — before tryInitialize can re-prompt as if nothing had
    // happened, which is precisely what the user saw before.
    if (await _resumePendingSubmit()) return
    await tryInitialize()
    if (window.__caramel_checkout_observer) return
    const rec = await getDomainRecord(location.hostname)
    if (!rec) return // not a supported store — don't observe at all
    let scheduled = false
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
        // before the user actually opens the cart. Over-broad selectors are
        // rejected here on the same terms as isCheckout(): this observer runs on
        // every DOM mutation, so a selector matching hundreds of elements would
        // otherwise re-summon the prompt across the whole site.
        if (
            caramelCouponAnchors(rec.couponInput).length > 0 ||
            caramelCouponAnchors(rec.showInput).length > 0
        ) {
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
    // childList catches a freshly-inserted coupon box; attributes catches the
    // equally common SPA case of a pre-rendered box merely revealed via a
    // class/style/hidden toggle (no new node, so childList alone misses it).
    // Both feed the same debounced recheck above — no separate mechanism.
    mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
    })
    window.__caramel_checkout_observer = mo
}
