import { beforeAll, describe, expect, it } from 'vitest'
import { loadExtensionSources } from './_load.mjs'

// "None of our codes BEAT the cart" is not "nothing worked" — and reporting
// the second when the first is true is the most expensive lie this flow can
// tell.
//
// Observed twice on live stores (2026-08-05), both with the discount printed
// on screen directly behind our own modal:
//   goodr.com   — cart holding BOLDERBOULDER15 at -$8.00
//   1thrive.com — cart holding JESS20 at -$20.00, which WE had just won
// Both times the modal read "Auto-apply didn't stick this time. Copy a code and
// paste it in the store's promo box", and offered the ALREADY-APPLIED code as
// the first thing to copy. Following that advice is what actually costs the
// money: pasting another code into a Shopify promo box replaces the live one.
// The extension never dropped the discount itself — it just told the user to.
//
// probeCartJson() already returned this data; nothing consulted it.

let _existingCartDiscount

beforeAll(() => {
    ;({ _existingCartDiscount } = loadExtensionSources(
        [
            'caramel-base.js',
            'dom-utils.js',
            'coupon-apply.js',
            'coupon-runner.js',
        ],
        ['_existingCartDiscount'],
    ))
})

describe('_existingCartDiscount', () => {
    it('names the code and amount already saving the user money', () => {
        const found = _existingCartDiscount({
            currency: 'USD',
            total_price: 15999,
            discount_codes: [
                { code: 'JESS20', amount: 2000, applicable: true },
            ],
        })
        expect(found?.code).toBe('JESS20')
        expect(found?.amountText).toContain('20.00')
    })

    it('reports nothing for a cart with no discount, so the normal copy list still shows', () => {
        expect(
            _existingCartDiscount({
                currency: 'USD',
                total_price: 4000,
                discount_codes: [],
            }),
        ).toBeNull()
    })

    it('ignores a code attached but worth zero, rather than announcing a saving', () => {
        // fanatical.com really does attach codes worth -$0.00; calling that a
        // saving would be the same dishonesty in the opposite direction.
        expect(
            _existingCartDiscount({
                currency: 'USD',
                discount_codes: [{ code: 'FMZ5', amount: 0, applicable: true }],
            }),
        ).toBeNull()
    })

    it('ignores a code the platform marks inapplicable', () => {
        expect(
            _existingCartDiscount({
                currency: 'USD',
                discount_codes: [
                    { code: 'DEAD', amount: 500, applicable: false },
                ],
            }),
        ).toBeNull()
    })

    it('accepts an older payload that omits the applicable flag', () => {
        const found = _existingCartDiscount({
            currency: 'USD',
            discount_codes: [{ code: 'LEGACY', amount: 800 }],
        })
        expect(found?.code).toBe('LEGACY')
    })

    it('renders the cart currency rather than assuming dollars', () => {
        const found = _existingCartDiscount({
            currency: 'GBP',
            discount_codes: [{ code: 'UKCODE', amount: 495 }],
        })
        // Intl may render "£4.95" or "GBP 4.95" depending on the ICU build;
        // both are honest, a "$" here would not be.
        expect(found?.amountText).not.toContain('$')
        expect(found?.amountText).toContain('4.95')
    })

    it('upper-cases the code so the copy list can filter it reliably', () => {
        // The live code must be dropped from "paste one of these" — matching is
        // case-insensitive because store payloads are inconsistent.
        expect(
            _existingCartDiscount({
                currency: 'USD',
                discount_codes: [{ code: 'jess20', amount: 2000 }],
            })?.code,
        ).toBe('JESS20')
    })

    it('survives a missing or malformed cart without throwing', () => {
        expect(_existingCartDiscount(null)).toBeNull()
        expect(_existingCartDiscount({})).toBeNull()
        expect(
            _existingCartDiscount({ discount_codes: 'not-an-array' }),
        ).toBeNull()
        expect(_existingCartDiscount({ discount_codes: [null, {}] })).toBeNull()
    })
})
