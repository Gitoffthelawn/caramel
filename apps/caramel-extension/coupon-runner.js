// owns: main apply-loop runner + auth-bridge/message listeners (startApplyingCoupons, _caramelCancelled, window "message" + runtime.onMessage listeners)
// load after: caramel-base.js, dom-utils.js, store-detect.js, coupon-apply.js, coupon-fetch.js

/* --------------------------------------------------  main runner */
// Set true when the user dismisses the testing overlay, so the loop stops
// instead of trapping them. Shared across content-script files (same realm).
// Guarded `var` (matches this file's re-injection convention — see sleep/log)
// so a second content-script injection doesn't throw on redeclaration.
if (typeof _caramelCancelled === 'undefined') {
    var _caramelCancelled = false
}

// Fire-and-forget trust-loop report → background (content scripts can't hit
// the API directly). Best-effort: an asleep/unreachable SW must never break
// the apply flow, so send errors are swallowed. No-op without a real coupon
// id (the #caramel-test mock list carries none).
function reportOutcome(id, outcome, storeReason) {
    if (!id) return
    try {
        const p = currentBrowser.runtime.sendMessage({
            action: 'reportOutcome',
            id: String(id),
            outcome,
            storeReason,
        })
        if (p && typeof p.then === 'function') p.catch(() => {})
    } catch (e) {
        log('REPORT_OUTCOME_SEND_FAILED', { error: String(e) })
    }
}

/* The discount already sitting on the cart when we arrived, if any.
 *
 * Reads the platform cart payload probeCartJson() already returns — the data
 * was always there, just never consulted, which is why a run could report
 * "nothing worked" over the top of a live discount. Returns
 * { code, amountText } or null.
 *
 * `discount_codes` entries carry `applicable` on newer carts; treat a missing
 * flag as applicable (older payloads omit it) but require a real amount, so a
 * code that is attached-but-worthless never gets announced as a saving.
 */
function _existingCartDiscount(cart) {
    if (!cart) return null
    const money = minor => {
        const value = Number(minor) / 100
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: cart.currency || 'USD',
            }).format(value)
        } catch {
            return `${value.toFixed(2)} ${cart.currency || 'USD'}`
        }
    }
    const codes = Array.isArray(cart.discount_codes) ? cart.discount_codes : []
    for (const entry of codes) {
        const amount = Number(entry?.amount)
        if (!entry?.code || !(amount > 0)) continue
        if (entry.applicable === false) continue
        return {
            code: String(entry.code).toUpperCase(),
            amountText: money(amount),
        }
    }
    // Cart-level discount with no code we can name (automatic discount): worth
    // nothing to say "code X is applied", so stay quiet rather than guess.
    return null
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
        /* Try them best-first, and keep the BEST result rather than the first
         * one that moves anything.
         *
         * The loop used to stop at the first code that beat the baseline by any
         * amount. On personalabs.com (2026-08-06) that took $1.35 on a $135
         * cart and declared "Savings Found", while flash35 — in the same list —
         * gave $47.25 by hand seconds later on the identical cart. The pill
         * promises "the best code"; this is what makes that sentence true.
         *
         * Affordable only here: each probe is a ~0.5s network call whose result
         * is the cart's real total, so the comparison is measured rather than
         * guessed. The DOM path still stops at its first win, because there each
         * attempt costs ~10s and removing a working code to shop around risks
         * ending with nothing.
         *
         * The winner may be the discount the shopper ARRIVED with: probing
         * replaces whatever is on the cart, so a code of theirs that beats
         * everything we hold has to be put back at the end, by name.
         */
        const linkCodes = caramelRankByValue(coupons, _cart0.total_price).slice(
            0,
            8,
        )
        const arrivedWith = _existingCartDiscount(_cart0)
        let bestTotal = _cart0.total_price
        let bestCode = null
        let bestId = null
        let bestCurrency = _cart0.currency
        for (let i = 0; i < linkCodes.length; i++) {
            if (_caramelCancelled) {
                // Stopping mid-probe leaves whichever code we tried last on the
                // cart. If the shopper had their own, hand it back before we go.
                if (arrivedWith) await applyViaDiscountLink(arrivedWith.code)
                log('AUTO_INSERT_STOP', {
                    result: 'cancelled',
                    restored: arrivedWith ? arrivedWith.code : null,
                    t: performance.now(),
                })
                return
            }
            const { code, id } = linkCodes[i]
            await updateTestingModal(i + 1, linkCodes.length, code)
            _markTriedCode(code)
            const after = await applyViaDiscountLink(code)
            // A null result means the request failed or the cart became
            // unreadable — we learned nothing about this code, so don't leave
            // it blacklisted for the rest of the session (see _unmarkTriedCode).
            if (!after) _unmarkTriedCode(code)
            if (after && after.total_price < bestTotal) {
                bestTotal = after.total_price
                bestCode = code
                bestId = id
                bestCurrency = after.currency || bestCurrency
            }
        }
        if (bestCode) {
            const saved = (_cart0.total_price - bestTotal) / 100
            // The cart currently carries whichever code we probed LAST. Put the
            // winner back before we tell anyone about it, and confirm from the
            // cart itself rather than assuming the re-apply took.
            const confirmed = await applyViaDiscountLink(bestCode)
            if (!confirmed || confirmed.total_price > bestTotal) {
                log('AUTO_INSERT_REAPPLY_UNCONFIRMED', {
                    code: bestCode,
                    expected: bestTotal,
                    got: confirmed ? confirmed.total_price : null,
                })
            }
            log('AUTO_INSERT_STOP', {
                result: 'applied',
                via: 'discount-link',
                bestCode,
                bestSave: saved,
                considered: linkCodes.length,
                t: performance.now(),
            })
            // Dispatch the "worked" trust-loop report BEFORE the reload below
            // unloads the page (the POST is already in flight by then).
            reportOutcome(bestId, 'worked')
            // Reload so the page's own UI shows the applied discount (tag + new
            // total), then re-show our result on the fresh document —
            // sessionStorage survives same-tab reloads and is per-origin, so the
            // handoff can't leak across sites.
            try {
                sessionStorage.setItem(
                    'caramel_applied',
                    JSON.stringify({
                        code: bestCode,
                        saved,
                        currency: confirmed?.currency || bestCurrency,
                        t: Date.now(),
                    }),
                )
            } catch {
                /* storage blocked — the discount is still applied */
            }
            location.reload()
            return
        }
        // Nothing we hold beat what the shopper already had. Probing replaced
        // their code on the cart, so put it back — leaving them worse off than
        // before we ran is the one outcome this flow must never produce.
        if (arrivedWith) {
            const restored = await applyViaDiscountLink(arrivedWith.code)
            log('AUTO_INSERT_RESTORED_EXISTING', {
                code: arrivedWith.code,
                restored: !!restored,
                total: restored ? restored.total_price : null,
            })
        }
        log('AUTO_INSERT_STOP', {
            result: 'none',
            via: 'discount-link',
            tried: linkCodes.map(c => c.code),
            t: performance.now(),
        })
        // None of the codes BEAT the baseline. That is not the same as "nothing
        // worked", and saying so when the cart already carries a discount is
        // the most dangerous thing this flow can tell a user.
        //
        // Seen twice on real stores (2026-08-05), both with the discount
        // printed on screen behind our own modal: goodr.com holding
        // BOLDERBOULDER15 at -$8.00, and 1thrive.com holding JESS20 at -$20.00
        // that WE had just won. In both cases the modal read "Auto-apply didn't
        // stick this time. Copy a code and paste it in the store's promo box"
        // and offered the already-applied code as the first thing to copy.
        // Following that advice is what actually costs the money: pasting
        // another code into a Shopify promo box REPLACES the live one. The tool
        // never dropped the discount itself — it just told the user to.
        const existing = arrivedWith
        if (existing) {
            // Drop the live code from the copy list: offering it is what makes
            // "paste one of these" a losing move.
            const others = coupons.filter(
                c => String(c.code).toUpperCase() !== existing.code,
            )
            showFinalModal(
                0,
                null,
                `${existing.code} is already applied and saving you ${existing.amountText} — we checked ${linkCodes.length} other code${linkCodes.length === 1 ? '' : 's'} and none beat it.`,
                false,
                others,
            )
            return
        }
        // Genuinely no discount on the cart — hand the codes over to copy
        // instead of also grinding the (deaf) DOM form.
        showFinalModal(0, null, null, false, coupons)
        return
    }

    // Nothing to discount? Say so, and don't spend the user's time or the
    // merchant's goodwill finding out.
    //
    // Observed on eddiebauer.com (2026-08-05): the prompt appeared on a cart
    // reading "Your cart is empty / Total $0.00", clicking it ran the full loop
    // for ~23 SECONDS, submitted two live codes to the merchant against zero
    // items, and then told the user to paste a code into an empty cart. From
    // the merchant's side that is indistinguishable from code-guessing traffic,
    // on every user who lands on an empty cart page. The extension's own
    // diagnosis was wrong too — it logged "no cart signal — checkout not
    // accepting injection", blaming a store that was behaving perfectly.
    //
    // Two independent signals, because the platforms differ: the cart payload
    // when probeCartJson() works (Shopify-class), and a readable total of zero
    // otherwise. `returnLargest` matters — it is the ORDER TOTAL, so a $0.00
    // reading means every number in the summary is zero, not just one line.
    // cricut.com and clarks.com already stay quiet on an empty cart, so this
    // aligns the rest of the fleet with behaviour users already get elsewhere.
    //
    // BUT the payload describes the STOREFRONT cart, and once a shopper is
    // inside the checkout it no longer describes what they are buying: Shopify
    // moves the items into the checkout session, so /cart.js on shop.<brand>.com
    // answers "0 items" for a cart that is plainly full. Measured on
    // bombas.com (2026-08-06): a $55.50 cart, one item, the store's own summary
    // reading "Total USD $70.50" one inch from our modal — and we told the
    // shopper their cart was empty and stopped, never attempting NATE, the one
    // code our own popup badges "✓ Verified" and which was worth $11.10 by hand.
    // Telling someone their full cart is empty is worse than the grind this
    // guard exists to prevent, so the payload is not consulted there.
    //
    // And neither signal may overrule the other: a claim this absolute needs
    // BOTH to be either empty or silent. Where they disagree, we simply carry
    // on and try codes, which is the recoverable mistake.
    const onCheckoutSurface =
        /\/checkouts?\//i.test(location.pathname) ||
        /^shop\./i.test(location.hostname)
    const domTotal = rec.priceContainer
        ? getPrice(rec.priceContainer, { returnLargest: true })
        : NaN
    const domSaysEmpty = Number.isFinite(domTotal) && domTotal === 0
    const domSaysFull = Number.isFinite(domTotal) && domTotal > 0
    const payloadUsable = !!_cart0 && !onCheckoutSurface
    const payloadSaysEmpty = payloadUsable && _cart0.item_count === 0
    const payloadSaysFull = !!_cart0 && _cart0.item_count > 0
    const emptyCart =
        (payloadSaysEmpty && !domSaysFull) || (domSaysEmpty && !payloadSaysFull)
    if (emptyCart) {
        log('AUTO_INSERT_STOP', { result: 'empty-cart', t: performance.now() })
        showFinalModal(
            0,
            null,
            "Your cart is empty — add something and we'll find you a code.",
        )
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
    if (!_box || !_isVisible(_box)) {
        // The config's own toggle first; failing that, the disclosure the page
        // itself declares around the box (see caramelDisclosureFor — most
        // configs never got a showInput, which is why phone checkouts went
        // dark). Same click, same guards, either way.
        const _toggle = rec.showInput
            ? pickBestMatch(rec.showInput, _box)
            : caramelDisclosureFor(_box)
        if (caramelIsForbiddenControl(_toggle)) {
            // Same refusal as the apply path: a reveal-toggle selector that
            // resolved to the checkout's own order button must never be driven.
            log('AUTO_INSERT_REFUSED_CONTROL', {
                reason: 'showInput selector resolved to an order-completing control',
            })
        } else if (_toggle) {
            _toggle.click()
            try {
                await waitForVisible(rec.couponInput, 2500)
            } catch {
                // late-bound accordion widgets can miss the first click
                _toggle.click()
                try {
                    await waitForVisible(rec.couponInput, 1500)
                } catch {
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

    // Cap ATTEMPTS to limit runtime — but keep every fetched code for the
    // manual fallback list. Truncating the shared array meant the codes we
    // never got around to trying were also never offered to the user: on a
    // store with 20 codes, 12 of them vanished from a modal whose whole job is
    // "here are codes you can paste yourself".
    const MAX_ATTEMPTS = 8
    const allCoupons = coupons
    if (coupons.length > MAX_ATTEMPTS) coupons = coupons.slice(0, MAX_ATTEMPTS)

    const hasPriceCfg = !!rec.priceContainer
    const original = hasPriceCfg
        ? getPrice(rec.priceContainer, { returnLargest: true })
        : NaN
    // Snapshot EVERY price the container held, not just the largest — the
    // saving is measured against the tightest of these (caramelBaselineFor).
    const originalPrices = hasPriceCfg ? _caramelLastPrices.slice() : []

    /* Was a discount already on this cart before we touched it?
     *
     * Two separate failures, one snapshot. The cleanup between codes clicks a
     * remove button, and on a cart that already carried the shopper's OWN code
     * it could take that away instead of ours — money removed by an action they
     * never asked for. And the closing message told a shopper whose cart was
     * already discounted that "auto-apply didn't stick", then offered codes to
     * paste, which on many checkouts REPLACES the live discount. The
     * discount-link path already learned this lesson against real carts
     * (goodr -$8.00, 1thrive -$20.00); this is the same honesty for the path
     * that drives the form. */
    const preExistingDiscount = qAll(findAppliedSelector(rec)).some(el =>
        _isVisible(el),
    )
    if (preExistingDiscount) {
        log('AUTO_INSERT_PRE_EXISTING_DISCOUNT', {
            reason: 'the cart already showed an applied discount before this run',
        })
    }
    let bestSave = 0
    // Set when a code demonstrably worked but the measured amount was not
    // believable (see the plausibility gate below) — keeps the "needs a minimum
    // spend" copy off a cart whose total DID move.
    let bestSaveUnmeasurable = false
    let bestCode = null
    let bestId = null // coupon id paired with bestCode, for the trust-loop report
    let lastStoreReason = null // last real error text the store showed us
    let lastFailId = null // coupon id paired with lastStoreReason
    const triedCodes = []
    // Codes the store turned down IN ITS OWN WORDS. The manual fallback sinks
    // these below the untried ones so we never lead with codes the user just
    // watched fail. Only real rejection text counts — a timeout or a silent
    // checkout says nothing about the code.
    const rejectedCodes = new Set()
    // Pattern-based early-exit: if the checkout gives ZERO feedback (no applied
    // row, no error text) for the first couple of codes, it isn't accepting our
    // injected input at all — stop probing instead of freezing the page ~10s ×
    // every code. Checks DOM *signals*, never the config's content.
    const EARLY_PROBE = 2
    let sawSignal = false
    let loggedUnobservable = false

    // Could we SEE an outcome on this page even if one happened?
    //
    // The early exit below reads "no signal after 2 codes" as "this checkout is
    // ignoring our input". That is only a fair reading if we were in a position
    // to notice a signal in the first place. On a store whose config has no
    // priceContainer (or one that no longer matches), every attempt measures
    // newTotal = NaN, no success/error element exists to watch, and the run
    // quits after 2 of 20 codes blaming the store.
    //
    // Measured on bombas.com (QA sweep 2026-08-05): it gave up after DRESSED20
    // and FITZ with "checkout not accepting injection", and the code NATE —
    // 4th in its own list, badged "Verified" in its own popup — was then
    // applied BY HAND in the same field seconds later for a real -$11.10. The
    // checkout was accepting injection perfectly well; we simply could not read
    // the result and blamed the store for our own blindness.
    //
    // So blindness must not masquerade as evidence. When no observation channel
    // works here, keep going — the wall-clock budget above is the backstop that
    // stops this becoming an unbounded grind — and log a reason that names OUR
    // limitation, so nothing downstream scores a working store as broken.
    const canObserveOutcome = () => {
        if (
            rec.priceContainer &&
            Number.isFinite(
                getPrice(rec.priceContainer, { returnLargest: true }),
            )
        )
            return true
        for (const sel of [rec.successIndicator, rec.errorIndicator])
            if (sel && qAll(sel).length) return true
        return false
    }

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
        // Written BEFORE the submit, because a submit that navigates never
        // comes back here (see caramelMarkPendingSubmit). Cleared immediately
        // after, so a normal attempt leaves nothing for the next page to read.
        caramelMarkPendingSubmit(code, coupons[i].id, originalPrices)
        const res = await applyCoupon(code, rec)
        caramelClearPendingSubmit()

        // Did this attempt prove ANYTHING about this code? An applied row, the
        // store's own error text, or a total we could actually read all count.
        // None of them means we learned nothing — most often because the config
        // has no usable priceContainer, or the cart is empty so no total can
        // move — and a code we never really tested must not stay blacklisted
        // for the rest of the session. See _unmarkTriedCode for the two live
        // cases ($11.25 and $11.10) this cost real users.
        if (!res.committed && !res.errorMsg && !Number.isFinite(res.newTotal)) {
            _unmarkTriedCode(code)
        }

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
                qAll(findAppliedSelector(rec)).some(
                    el => _isVisible(el) && !caramelRowReadsRejected(el),
                )
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
            // Measure against the most conservative baseline the page supports
            // rather than the largest number in the container. A config's
            // price selector is routinely too broad — it catches an MSRP
            // strikethrough or a "save up to $500" banner alongside the real
            // total — and `original - newTotal` would then invent a headline
            // figure the user never received. caramelBaselineFor picks the
            // smallest price seen that is still >= the new total, which can
            // never overstate the discount. NaN (nothing qualifies, e.g. the
            // total went UP) means claim no figure at all.
            const baseline = hasPriceCfg
                ? caramelBaselineFor(res.newTotal, originalPrices)
                : NaN
            const diff =
                hasPriceCfg && !isNaN(res.newTotal) && !isNaN(baseline)
                    ? baseline - res.newTotal
                    : 0
            const believable = diff > 0
            if (hasPriceCfg && !isNaN(original) && baseline !== original) {
                log('AUTO_INSERT_BASELINE_NARROWED', {
                    code,
                    largestSeen: original,
                    baselineUsed: baseline,
                    newTotal: res.newTotal,
                    reason: 'price container held more than one number — used the tightest defensible baseline',
                })
            }
            log(`✓ ${code} saved ${diff || '(unknown — no priceContainer)'}`)
            bestSave = believable ? diff : 0
            // Worked, but no defensible baseline existed (the total didn't drop
            // below anything the container showed). Don't invent a number — and
            // don't blame a minimum spend either.
            bestSaveUnmeasurable =
                hasPriceCfg && !isNaN(res.newTotal) && isNaN(baseline)
            bestCode = code
            bestId = coupons[i].id
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
            lastFailId = coupons[i].id // pair the reason with its coupon
            rejectedCodes.add(code)
        }
        if (res.committed) {
            await removeAppliedCoupon(rec, {
                code,
                hadPreExisting: preExistingDiscount,
            })
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
            if (canObserveOutcome()) {
                log('AUTO_INSERT_EARLY_EXIT', {
                    tried: i + 1,
                    reason: 'no cart signal — checkout not accepting injection',
                    t: performance.now(),
                })
                break
            }
            // Blind, not ignored — see canObserveOutcome. Keep trying the
            // remaining codes under the wall-clock budget rather than quitting
            // on evidence we were never able to gather.
            if (!loggedUnobservable) {
                loggedUnobservable = true
                log('AUTO_INSERT_UNOBSERVABLE', {
                    tried: i + 1,
                    reason: 'cannot read this checkout (no usable price or success/error selector) — continuing rather than blaming the store',
                    t: performance.now(),
                })
            }
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
        reportOutcome(bestId, 'worked')
        // Feed the popup's savings history — measured wins ONLY. bestSave is 0
        // both when there was no price config and when the measurement failed
        // the plausibility gate; neither is a figure worth banking, and a run
        // of 0s would dilute the user's lifetime total.
        if (bestSave > 0) {
            // The currency the PRICE PARSER actually saw, not a hardcoded USD:
            // the modal already renders £/€ correctly, so banking the history
            // as dollars made the popup's lifetime total disagree with the
            // figure the same user had just been shown.
            caramelRecordSaving({
                domain: location.hostname,
                code: bestCode,
                amount: bestSave,
                currency: caramelCurrencyCode(),
            })
        }
        /* A code that didn't move a READABLE total is not a code we can call
         * applied.
         *
         * The old copy here headlined "✓ Coupon Applied / Discount visible in
         * your cart" and explained the flat total as a minimum spend that
         * hadn't kicked in "yet". On allposters.com (QA sweep 2026-08-05) all
         * three statements were false at once: the total was identical before,
         * after, and after a reload; the promo box was empty; and the store had
         * printed its actual reason next to our modal — promo codes cannot be
         * combined with the sitewide promo the cart already had. We turned a
         * flat rejection into "success, pending", under a Proceed to Checkout
         * button.
         *
         * The measurement is the same; only the claim changes. We say what we
         * did and what we saw, name the store's reason when it gave one, and
         * point the shopper at their own order summary rather than asserting a
         * discount is riding along. A minimum spend is offered as a
         * possibility, not as the explanation. */
        const zeroEffect =
            hasPriceCfg &&
            !isNaN(original) &&
            !(bestSave > 0) &&
            !bestSaveUnmeasurable
        if (zeroEffect) {
            const reason = lastStoreReason
                ? ` The store said: “${String(lastStoreReason).slice(0, 140)}”.`
                : ''
            showFinalModal(
                0,
                null,
                `We put ${bestCode} into the promo box, but your total didn't change.${reason} It may need a minimum spend, or the store may not combine it with a discount you already have — check your order summary before you check out.`,
                false,
                caramelSinkTriedCodes(
                    allCoupons.map(c =>
                        rejectedCodes.has(c.code)
                            ? { ...c, rejected: true }
                            : c,
                    ),
                ),
            )
        } else {
            showFinalModal(bestSave, bestCode)
        }
    } else {
        log('AUTO_INSERT_STOP', {
            result: 'none',
            bestCode: null,
            bestSave: 0,
            tried: triedCodes,
            t: performance.now(),
        })
        // Report 'failed' ONLY when a coupon produced the store's real
        // rejection reason (lastFailId set → lastStoreReason is that text).
        // When the checkout gave no real signal — no-signal early-exit, time
        // budget, or an untrusted synthetic click — lastFailId stays null and
        // we fire NOTHING: a valid code the store rejected only because our
        // click isn't trusted must never be recorded as a coupon failure.
        if (lastFailId) reportOutcome(lastFailId, 'failed', lastStoreReason)
        // Nothing auto-applied. Hand the tried codes to the modal so the user
        // gets a manual copy/paste fallback (covers valid codes the store's
        // checkout rejected only because our synthetic click isn't trusted).
        // When the store told us WHY (login required, min spend, expired…),
        // repeat its own words — that's the honest, transparent version.
        // A cart that arrived with a discount on it was NOT a failure, and the
        // generic "didn't stick — paste one of these" line is actively
        // dangerous there: on most checkouts pasting a second code replaces the
        // live one, so following our advice is what costs the money.
        const storeSaid = lastStoreReason
            ? `The store said: “${String(lastStoreReason).slice(0, 140)}”`
            : null
        let noWinMessage = null
        if (preExistingDiscount) {
            // The warning outranks the usual "copy a code and paste it" advice
            // even when the store gave a reason — that advice is the thing that
            // costs the money here, so it must never appear over a live
            // discount. The store's own words still lead when we have them.
            noWinMessage =
                `${storeSaid ? `${storeSaid} — but ` : ''}your cart already has a discount on it,` +
                ` and none of the ${triedCodes.length} code${triedCodes.length === 1 ? '' : 's'} we tried beat it.` +
                ` Pasting another may replace what you've got, so only swap if you want to.`
        } else if (storeSaid) {
            noWinMessage = `${storeSaid} — copy a code below to try it manually.`
        }
        showFinalModal(
            0,
            null,
            noWinMessage,
            false,
            caramelSinkTriedCodes(
                allCoupons.map(c =>
                    rejectedCodes.has(c.code) ? { ...c, rejected: true } : c,
                ),
            ),
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
            caramelSetSession(
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
    // Website→extension sign-in relay: on our own site, when the extension
    // has no session yet, announce ourselves — a signed-in page answers
    // with a token (accepted by the listener above, allowlisted origins
    // only). One hello per page load; the page mints at most once.
    // typeof guard: unlike the deferred listener above, this runs at
    // module-eval time, and the vitest harness evals each file separately
    // (cross-file top-level consts aren't visible there — see _load.mjs).
    if (
        typeof CARAMEL_ALLOWED_ORIGINS !== 'undefined' &&
        CARAMEL_ALLOWED_ORIGINS.has(location.origin)
    ) {
        try {
            caramelGetSession().then(({ token }) => {
                if (!token) {
                    window.postMessage(
                        { type: 'caramel-ext-hello' },
                        location.origin,
                    )
                }
            })
        } catch {
            /* storage unavailable — skip the handshake */
        }
    }

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
