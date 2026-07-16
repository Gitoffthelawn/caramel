import { beforeAll, describe, expect, it } from 'vitest'
import { loadExtensionSource, loadExtensionSources } from './_load.mjs'

// Pins the settings-gear visibility contract (index.html: "shown only when
// user is logged in"): the MAIN signed-in path — a logged-in user on a
// supported store — goes through renderCouponsView(), which must show
// #settingsIcon. Before this pin only the no-tab profile card set it, so the
// gear silently never appeared in the dominant real-world view.
//
// Harness mirrors popup.test.mjs: real load order, one shared chrome stub,
// only the messaging transport + storage stubbed.
let initPopup

beforeAll(() => {
    document.body.innerHTML =
        '<div id="loading-container"></div>' +
        '<button id="settingsIcon" style="display:none"></button>' +
        '<div id="auth-container"></div>'

    loadExtensionSource('coupon-constants.generated.js', [])
    loadExtensionSources(
        [
            'caramel-base.js',
            'dom-utils.js',
            'store-detect.js',
            'coupon-apply.js',
            'coupon-fetch.js',
            'coupon-runner.js',
        ],
        [],
    )

    globalThis.currentBrowser.runtime.sendMessage = (message, cb) => {
        if (message?.action === 'getActiveTabDomainRecord') {
            cb({ url: 'https://example.com/cart' })
        } else if (message?.action === 'fetchCoupons') {
            cb({
                coupons: [
                    {
                        code: 'SAVE10',
                        title: 'Save 10%',
                        status: 'valid',
                    },
                ],
            })
        } else {
            cb(undefined)
        }
    }
    globalThis.currentBrowser.storage.sync.get = (_keys, cb) =>
        cb({ token: 'test-token', user: { username: 'tester', image: '' } })
    ;({ initPopup } = loadExtensionSource('popup.js', ['initPopup']))
})

describe('popup.js renderCouponsView — settings gear contract', () => {
    it('shows #settingsIcon for a signed-in user in the coupons view', async () => {
        await initPopup()

        const html = document.getElementById('auth-container').innerHTML
        expect(html).toContain('@tester') // coupons view actually rendered
        expect(html).toContain('SAVE10')

        const gear = document.getElementById('settingsIcon')
        expect(gear.style.display).toBe('block')
        expect(typeof gear.onclick).toBe('function')
    })
})
