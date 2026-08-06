import { beforeAll, describe, expect, it } from 'vitest'
import { loadExtensionSources } from './_load.mjs'

// The prompt is fixed 20px from the top-right and up to 300px wide, which on a
// phone is most of the header. QA's first-time users kept meeting the
// consequences rather than the product:
//
//   allbirds.com at 390px — sat on the logo
//   cultbeauty.co.uk      — sat on "Earn Cult Status Points"
//   motoin.de             — landed ~20px from the store's OWN ×, so neither
//                           close button could be told from the other
//
// Reading as "part of this website, in the way" is the worst first impression an
// injected surface can make. So it starts below whatever the store has pinned
// across the top — measured, not assumed, and only ever downward: with nothing
// pinned there, the position is bit-for-bit what it always was.
//
// The decision is split from the DOM probe because jsdom has no layout, so what
// is pinned where cannot be measured in a unit test — but what to DO about a
// measurement can be, and that is the part with a rule in it.

let caramelPromptTopFor
let _caramelUsableTitle

beforeAll(() => {
    ;({ caramelPromptTopFor, _caramelUsableTitle } = loadExtensionSources(
        [
            'coupon-constants.generated.js',
            'caramel-base.js',
            'dom-utils.js',
            'store-detect.js',
            'coupon-apply.js',
            'coupon-fetch.js',
            'coupon-runner.js',
            'UI-helpers.js',
        ],
        ['caramelPromptTopFor', '_caramelUsableTitle'],
    ))
})

describe('clearing the store’s own top bar', () => {
    it('starts below a typical sticky header', () => {
        expect(caramelPromptTopFor(64)).toBe(76)
    })

    it('clears an announcement bar stacked on a nav', () => {
        expect(caramelPromptTopFor(112)).toBe(124)
    })

    it('changes nothing when the store has pinned nothing', () => {
        expect(caramelPromptTopFor(NaN)).toBe(20)
        expect(caramelPromptTopFor(undefined)).toBe(20)
        expect(caramelPromptTopFor(null)).toBe(20)
    })

    it('changes nothing for a bar that ends above where we already start', () => {
        // A 12px-tall ribbon is already clear of a 20px offset — moving would
        // be motion for its own sake.
        expect(caramelPromptTopFor(12)).toBe(20)
        expect(caramelPromptTopFor(0)).toBe(20)
    })

    it('refuses to dodge something so tall it would push us off screen', () => {
        // A full-height fixed overlay (a nav drawer, a cookie wall) is not a
        // header, and starting 400px down would hide the prompt entirely.
        expect(caramelPromptTopFor(400)).toBe(20)
    })

    it('never moves upward, into the browser chrome', () => {
        expect(caramelPromptTopFor(-50)).toBe(20)
    })
})

describe('a title that is really just the label again', () => {
    // cottonon.com shipped a list whose every title was the literal word
    // "CODE" — a second copy of what the row is already headed by, occupying
    // the line where the discount should be.
    it('drops the placeholder headings scrapers pick up', () => {
        expect(_caramelUsableTitle('CODE')).toBe('')
        expect(_caramelUsableTitle('Coupon Code')).toBe('')
        expect(_caramelUsableTitle('promo code')).toBe('')
        expect(_caramelUsableTitle('Discount Codes')).toBe('')
    })

    it('drops a title that only repeats the code', () => {
        expect(_caramelUsableTitle('SAVE20', 'save20')).toBe('')
        expect(_caramelUsableTitle(' SAVE20 ', 'SAVE20')).toBe('')
    })

    it('keeps a real offer, including one that names its own code', () => {
        expect(_caramelUsableTitle('20% off with SAVE20', 'SAVE20')).toBe(
            '20% off with SAVE20',
        )
        expect(_caramelUsableTitle('Free shipping')).toBe('Free shipping')
        expect(_caramelUsableTitle('Code for 15% off')).toBe('Code for 15% off')
    })

    it('still drops the zero-value claims it always did', () => {
        expect(_caramelUsableTitle('Score 0% off with coupon code')).toBe('')
        expect(_caramelUsableTitle('$0.00 off')).toBe('')
    })
})
