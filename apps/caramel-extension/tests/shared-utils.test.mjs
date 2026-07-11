import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadExtensionSource } from './_load.mjs'

// Characterization pins (F-004) — lock CURRENT behavior of two pure/near-
// pure helpers in shared-utils.js (the repo's #1-churn, #1-LOC file, F-008)
// before it gets split. Loaded ONCE for the whole file: the source has
// top-level guards against double-loading (window.__caramel_shared_utils_loaded)
// so re-evaluating per-test would silently no-op the second time.
let _isXPath
let getPrice

beforeAll(() => {
    // F-006 — coupon-constants.generated.js sets window.CaramelCoupons,
    // which shared-utils.js now reads unconditionally at module-eval time
    // (RESTRICTED_STATUSES's rebind). Real load order (manifest.json,
    // manifest-firefox.json, index.html) always puts it first; mirror that
    // here or shared-utils.js throws on load.
    loadExtensionSource('coupon-constants.generated.js', [])
    ;({ getPrice, _isXPath } = loadExtensionSource('shared-utils.js', [
        'getPrice',
        '_isXPath',
    ]))
})

beforeEach(() => {
    document.body.innerHTML = ''
})

describe('_isXPath (shared-utils.js:233, pure)', () => {
    it('recognizes XPath expressions by leading token', () => {
        expect(_isXPath('//input')).toBe(true)
        expect(_isXPath('(//div)[2]')).toBe(true)
        expect(_isXPath('./x')).toBe(true)
    })

    it('rejects CSS selectors, empty strings, and non-strings', () => {
        expect(_isXPath('input#code')).toBe(false)
        expect(_isXPath('')).toBe(false)
        expect(_isXPath(null)).toBe(false)
        expect(_isXPath(undefined)).toBe(false)
        expect(_isXPath(42)).toBe(false)
    })
})

describe('getPrice (shared-utils.js:203)', () => {
    // getPrice reads el.innerText, which jsdom does not compute from
    // textContent/layout — set BOTH explicitly. Object.defineProperty
    // guarantees the assignment sticks even if jsdom ever defines
    // innerText as a getter-only accessor.
    function makeEl(text) {
        const el = document.createElement('div')
        el.id = 'price'
        el.textContent = text
        Object.defineProperty(el, 'innerText', {
            value: text,
            configurable: true,
        })
        document.body.appendChild(el)
        return el
    }

    it('parses a single price', () => {
        makeEl('$100.00')
        expect(getPrice('#price')).toBe(100)
    })

    it('defaults to the first match when multiple prices are present', () => {
        makeEl('Now $75.00 (was $100.00)')
        expect(getPrice('#price')).toBe(75)
    })

    it('returns the largest match when { returnLargest: true }', () => {
        makeEl('Now $75.00 (was $100.00)')
        expect(getPrice('#price', { returnLargest: true })).toBe(100)
    })

    it('returns NaN when the element has no price-shaped text', () => {
        makeEl('Free shipping')
        expect(getPrice('#price')).toBeNaN()
    })

    it('returns NaN when the selector matches nothing', () => {
        expect(getPrice('#does-not-exist')).toBeNaN()
    })
})
