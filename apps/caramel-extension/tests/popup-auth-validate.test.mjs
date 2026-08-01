import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadExtensionSource, loadExtensionSources } from './_load.mjs'

// Pins the popup's session validation: a stored token is no longer trusted
// forever. initPopup() fires GET /api/extension/me with the bearer IN
// PARALLEL with the coupon fetch — a real 401 clears token+user from
// storage.sync and re-renders the logged-out variant; a 200 keeps the
// signed-in state (and refreshes the stored user when the profile
// changed). Network errors are NOT a logout — offline must never sign the
// user out.
//
// Harness mirrors popup-settings-view.test.mjs: real load order, one
// shared chrome stub, only the messaging transport + storage + fetch
// stubbed.
let initPopup
let syncData
let meResponse

const flush = async () => {
    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 0))
    }
}

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
            cb({ url: 'https://www.example.com/cart' })
        } else if (message?.action === 'fetchCoupons') {
            cb({
                coupons: [{ code: 'SAVE10', title: 'Save', status: 'valid' }],
            })
        } else {
            cb(undefined)
        }
    }
    globalThis.currentBrowser.storage.sync.get = (_keys, cb) =>
        cb({ ...syncData })
    globalThis.currentBrowser.storage.sync.set = (items, cb) => {
        Object.assign(syncData, items)
        if (cb) cb()
    }
    globalThis.currentBrowser.storage.sync.remove = (keys, cb) => {
        for (const key of keys) delete syncData[key]
        if (cb) cb()
    }
    ;({ initPopup } = loadExtensionSource('popup.js', ['initPopup']))
})

beforeEach(() => {
    syncData = { token: 'tok-1', user: { username: 'caramel-fan', image: '' } }
    // Only the /me probe goes through fetch here (coupons ride the
    // sendMessage transport above); each test sets meResponse.
    globalThis.fetch = async url => {
        expect(String(url)).toContain('/api/extension/me')
        return meResponse
    }
})

describe('popup.js initPopup — stored-token validation via /api/extension/me', () => {
    it('a token the backend 401s clears token+user from storage and re-renders the logged-out variant', async () => {
        meResponse = { ok: false, status: 401 }
        await initPopup()
        await flush()
        expect(syncData.token).toBeUndefined()
        expect(syncData.user).toBeUndefined()
        const html = document.getElementById('auth-container').innerHTML
        expect(html).toContain('Guest')
        expect(html).not.toContain('caramel-fan')
    })

    it('a token the backend accepts (200) keeps the signed-in state and the stored token', async () => {
        meResponse = {
            ok: true,
            status: 200,
            json: async () => ({ username: 'caramel-fan', image: '' }),
        }
        await initPopup()
        await flush()
        expect(syncData.token).toBe('tok-1')
        expect(document.getElementById('auth-container').innerHTML).toContain(
            '@caramel-fan',
        )
    })

    it('a 200 with a changed profile refreshes the stored user', async () => {
        meResponse = {
            ok: true,
            status: 200,
            json: async () => ({ username: 'renamed', image: 'pic.png' }),
        }
        await initPopup()
        await flush()
        expect(syncData.user).toEqual({ username: 'renamed', image: 'pic.png' })
        expect(syncData.token).toBe('tok-1')
    })

    it('a network failure is NOT a logout — offline keeps the stored session', async () => {
        globalThis.fetch = async () => {
            throw new TypeError('Failed to fetch')
        }
        await initPopup()
        await flush()
        expect(syncData.token).toBe('tok-1')
        expect(document.getElementById('auth-container').innerHTML).toContain(
            '@caramel-fan',
        )
    })
})
