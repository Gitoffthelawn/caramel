import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadExtensionSources } from './_load.mjs'

// A store config is refined continuously and is WRONG for long stretches. The
// costliest way it can be wrong is `price_container_xpath`: getPrice() takes the
// LARGEST number inside whatever element the config names, so a selector aimed
// at an MSRP strikethrough or a "save up to $500" banner inflates the cart's
// "original" price. `original - newTotal` then yields a headline savings figure
// the user never actually received — the one failure mode that costs trust
// outright, and that the user cannot detect by looking at the modal.
//
// These pin the plausibility gate in coupon-runner.js: a claimed saving must fit
// INSIDE the cart it was measured against.

let startApplyingCoupons
let finalModalCalls
let recordedSavings

const REC = {
    domain: 'example.com',
    couponInput: '#promo',
    applyButton: '#apply',
    priceContainer: '#total',
}

/** jsdom leaves innerText undefined; getPrice reads it. */
function setTotalText(text) {
    let el = document.getElementById('total')
    if (!el) {
        el = document.createElement('div')
        el.id = 'total'
        document.body.appendChild(el)
    }
    Object.defineProperty(el, 'innerText', { value: text, configurable: true })
}

beforeAll(() => {
    loadExtensionSources(
        [
            'coupon-constants.generated.js',
            'caramel-base.js',
            'dom-utils.js',
            'store-detect.js',
            'coupon-apply.js',
            'coupon-fetch.js',
            'coupon-runner.js',
        ],
        ['startApplyingCoupons'],
    )
    startApplyingCoupons = globalThis.startApplyingCoupons
})

beforeEach(() => {
    document.body.innerHTML =
        '<input id="promo" /><button id="apply">Apply</button>'
    globalThis._caramelCancelled = false
    finalModalCalls = []
    recordedSavings = []

    // Collaborators stubbed so the test drives the runner's DECISION logic,
    // not the network, the overlay chrome, or a real checkout.
    globalThis.getCoupons = async () => [{ code: 'SAVE10', id: 'c1' }]
    globalThis._getTriedCodes = () => ({})
    globalThis.probeCartJson = async () => null // force the DOM form path
    globalThis._isVisible = () => true // jsdom has no layout
    globalThis.waitUntilReady = async () => {}
    globalThis.showTestingModal = async () => {}
    globalThis.updateTestingModal = async () => {}
    globalThis.hideTestingModal = () => {}
    globalThis.reportOutcome = () => {}
    globalThis.caramelRecordSaving = s => recordedSavings.push(s)
    globalThis.showFinalModal = (...args) => finalModalCalls.push(args)
})

describe('coupon-runner.js — a claimed saving must fit inside the cart', () => {
    it('ignores a promo banner in the price container and reports the REAL saving', async () => {
        // The config's selector is too broad: the container holds a "$500 off"
        // banner as well as the order total, and getPrice(returnLargest) reads
        // 500. Measuring off that would headline $462.20.
        setTotalText('Save up to $500 today! Order total: $42.00')
        globalThis.applyCoupon = async () => ({
            success: true,
            newTotal: 37.8,
            committed: true,
        })

        await startApplyingCoupons(REC)

        expect(finalModalCalls).toHaveLength(1)
        const [amount, code] = finalModalCalls[0]
        expect(amount).not.toBeCloseTo(462.2, 1) // the naive arithmetic
        expect(amount).toBeCloseTo(4.2, 2) // 42.00 - 37.80, the truth
        expect(code).toBe('SAVE10')
        // and the user's lifetime total banks the real figure, not the banner
        expect(recordedSavings).toHaveLength(1)
        expect(recordedSavings[0].amount).toBeCloseTo(4.2, 2)
    })

    it('does not tell the user the total "hasn\'t changed" when it demonstrably did', async () => {
        setTotalText('Order total: $42.00')
        globalThis.applyCoupon = async () => ({
            success: true,
            // Dropped below the cart, but the container no longer shows a
            // number at or above it — no defensible baseline to measure from.
            newTotal: 55,
            committed: true,
        })

        await startApplyingCoupons(REC)

        const message = finalModalCalls[0][2]
        // The min-spend copy would be a plain lie about their own cart here.
        expect(message ?? '').not.toMatch(/hasn't changed the total/i)
        expect(message ?? '').not.toMatch(/minimum spend/i)
    })

    it('still reports a normal, believable saving (happy path intact)', async () => {
        setTotalText('Order total: $42.00')
        globalThis.applyCoupon = async () => ({
            success: true,
            newTotal: 37.8,
            committed: true,
        })

        await startApplyingCoupons(REC)

        const [amount, code] = finalModalCalls[0]
        expect(amount).toBeCloseTo(4.2, 2)
        expect(code).toBe('SAVE10')
        expect(recordedSavings).toHaveLength(1)
        expect(recordedSavings[0]).toMatchObject({
            code: 'SAVE10',
            amount: expect.closeTo(4.2, 2),
        })
    })

    it('claims nothing when the "new" total is HIGHER than the original', async () => {
        // Mis-measurement or a re-rendered total that grew — either way this is
        // not a saving and must never render as one.
        setTotalText('Order total: $42.00')
        globalThis.applyCoupon = async () => ({
            success: true,
            newTotal: 55,
            committed: true,
        })

        await startApplyingCoupons(REC)

        expect(finalModalCalls[0][0]).toBe(0)
        expect(recordedSavings).toEqual([])
    })

    it('allows a full 100%-off saving (equal to the total) — the boundary is inclusive', async () => {
        setTotalText('Order total: $42.00')
        globalThis.applyCoupon = async () => ({
            success: true,
            newTotal: 0,
            committed: true,
        })

        await startApplyingCoupons(REC)

        expect(finalModalCalls[0][0]).toBeCloseTo(42, 2)
        expect(recordedSavings).toHaveLength(1)
    })
})

// --- scraped codes are dirty strings ---------------------------------------
// A code is typed into the store's input verbatim and handed to the clipboard
// verbatim. Whitespace the scraper carried over turns a working code into a
// store rejection, which the trust loop then records against the coupon.

describe('coupon-fetch.js — scraped codes are normalised before use', () => {
    it('strips surrounding whitespace, newlines and zero-width characters', () => {
        const clean = globalThis._caramelCleanCodes([
            { code: '  SAVE10\n' },
            { code: '\u200bWELCOME20\ufeff' },
            { code: 'NBSP\u00a0END' },
            { code: 'ALREADYFINE' },
        ])
        expect(clean.map(c => c.code)).toEqual([
            'SAVE10',
            'WELCOME20',
            'NBSP END', // internal space preserved — some stores issue these
            'ALREADYFINE',
        ])
    })

    it('drops codes that are empty once cleaned, and leaves the array otherwise intact', async () => {
        const clean = globalThis._caramelCleanCodes([
            { code: '   ' },
            { code: '\u200b' },
            { code: 'REAL5', title: 'keeps its other fields' },
        ])
        expect(clean).toHaveLength(1)
        expect(clean[0]).toMatchObject({
            code: 'REAL5',
            title: 'keeps its other fields',
        })
    })

    it('passes a non-array through untouched (cold cache / fetch failure)', () => {
        expect(globalThis._caramelCleanCodes(null)).toBeNull()
        expect(globalThis._caramelCleanCodes(undefined)).toBeUndefined()
    })
})
