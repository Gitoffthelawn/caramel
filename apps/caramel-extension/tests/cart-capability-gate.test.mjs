import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadExtensionSources } from './_load.mjs'

// Whether to offer help on a page was decided entirely by "does the config's
// promo selector match something visible here". That asks about our
// configuration, not about what we can actually DO for the shopper.
//
// The 2026-08-05 QA sweep measured the gap: roughly half the catalogue
// (~1,300 stores) carries a coupon selector written against the CHECKOUT, so a
// shopper sitting on the cart page of a store that HAS codes in our database
// got nothing — no pill, no coupon fetch, nothing. On the platforms in
// question, the discount-link path needs no promo box at all and would have
// worked from that very page.
//
// A store that has coupons must be usable. So the gate now also opens on
// capability: a live cart, with something in it, that we can read and drive.

let isCheckout
let probeCalls

const REC = { domain: 'example.com', couponInput: '#promo' }

function setPath(pathname) {
    window.history.replaceState({}, '', pathname)
}

beforeAll(() => {
    ;({ isCheckout } = loadExtensionSources(
        [
            'coupon-constants.generated.js',
            'caramel-base.js',
            'dom-utils.js',
            'store-detect.js',
            'coupon-apply.js',
            'coupon-fetch.js',
            'coupon-runner.js',
        ],
        ['isCheckout'],
    ))
})

beforeEach(() => {
    document.body.innerHTML = ''
    probeCalls = 0
    setPath('/')
    globalThis.getDomainRecord = async () => REC
    // jsdom has no layout, so the visibility test fails closed for every
    // element — which is exactly the state this gate exists for: no promo box.
    globalThis.waitForElement = async () => {
        throw new Error('not found')
    }
    globalThis.probeCartJson = async () => {
        probeCalls++
        return { token: 't', total_price: 4499, item_count: 2, currency: 'USD' }
    }
})

describe('isCheckout — capability, not just configuration', () => {
    it('helps on a cart page whose promo box lives on the checkout', async () => {
        setPath('/cart')

        expect(await isCheckout()).toBe(true)
    })

    it('recognises the other names stores give that page', async () => {
        for (const path of [
            '/basket',
            '/checkout',
            '/checkouts/c/abc123',
            '/shopping-cart',
            '/en-gb/cart?step=1',
        ]) {
            setPath(path)
            expect(await isCheckout(), path).toBe(true)
        }
    })

    it('stays quiet on a cart the shopper has not filled', async () => {
        setPath('/cart')
        globalThis.probeCartJson = async () => ({
            token: 't',
            total_price: 0,
            item_count: 0,
            currency: 'USD',
        })

        expect(await isCheckout()).toBe(false)
    })

    it('stays quiet where the platform has no cart to read', async () => {
        // Non-Shopify-class store: the probe simply fails, and a page with no
        // promo box and no readable cart is a page we cannot help on.
        setPath('/cart')
        globalThis.probeCartJson = async () => null

        expect(await isCheckout()).toBe(false)
    })

    it('does not turn a product page into a checkout', async () => {
        setPath('/products/leather-satchel')

        expect(await isCheckout()).toBe(false)
    })

    it('leaves the bag CATEGORY alone', async () => {
        // /collections/bag is a category on a great many stores, and a shopper
        // with a full cart browsing handbags is not at a checkout.
        setPath('/collections/bag')

        expect(await isCheckout()).toBe(false)
    })

    it('costs an ordinary page no network request at all', async () => {
        setPath('/products/leather-satchel')

        await isCheckout()

        expect(probeCalls).toBe(0)
    })

    // A store with no config row at all used to return false here without even
    // probing. That was the same mistake this file was written to fix, one
    // level up: "we have no configuration for this host" answered as "there is
    // nothing we can do for this shopper". Sampled against the live catalogue
    // on 2026-08-06, 209 of 573 stores we hold coupons for (36%) have no config
    // row — and on a readable cart the discount-link path needs none of it.
    //
    // What it costs is one same-origin GET of /cart.js on cart-shaped URLs of
    // stores we may not cover. The store already knows the shopper is on its
    // own cart page, and the checks below keep it off every other page.
    describe('a store with no config row of its own', () => {
        beforeEach(() => {
            globalThis.getDomainRecord = async () => null
        })

        it('is helped anyway when its cart is readable and has something in it', async () => {
            setPath('/cart')

            expect(await isCheckout()).toBe(true)
        })

        it('is left alone when the platform has no cart to read', async () => {
            setPath('/cart')
            globalThis.probeCartJson = async () => null

            expect(await isCheckout()).toBe(false)
        })

        it('is left alone when the cart is empty', async () => {
            setPath('/cart')
            globalThis.probeCartJson = async () => ({
                token: 't',
                total_price: 0,
                item_count: 0,
                currency: 'USD',
            })

            expect(await isCheckout()).toBe(false)
        })

        it('costs an ordinary page of it no request at all', async () => {
            // The whole web has product pages. Only cart-shaped URLs may probe.
            setPath('/products/leather-satchel')

            expect(await isCheckout()).toBe(false)
            expect(probeCalls).toBe(0)
        })
    })
})
