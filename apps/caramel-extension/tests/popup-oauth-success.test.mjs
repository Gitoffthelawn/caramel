import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadExtensionSource, loadExtensionSources } from './_load.mjs'

// The OAuth SUCCESS path — everything the extension does once the provider
// hands back a callback URL. Until now this was the only auth path with no
// coverage at all, because proving it live requires signing into a real
// Google account (the QA rule forbids it, and the account password is
// deliberately not stored anywhere).
//
// So the live leg and this suite split the work honestly:
//   * live (needs a human): the provider window itself, and whether the
//     BACKEND can exchange the code for a session.
//   * here (deterministic): that the extension sends the right exchange
//     request, and that a successful exchange lands the session in storage
//     rather than being dropped on the floor.
// The seam is launchWebAuthFlow's resolved callback URL, which is exactly
// what Chrome hands back — so this stubs the provider, not our own code.
let renderSignInPrompt
let syncData
let lastExchange

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
    globalThis.currentBrowser.tabs.create = () => {}
    window.close = vi.fn()
    ;({ renderSignInPrompt } = loadExtensionSource('popup.js', [
        'renderSignInPrompt',
    ]))
})

const withIdentity = callbackUrl => {
    globalThis.currentBrowser.identity = {
        launchWebAuthFlow: async () => callbackUrl,
        getRedirectURL: () => 'https://ext-id.chromiumapp.org/',
    }
    globalThis.currentBrowser.chrome = undefined
}

/** authorize → { authorizationUrl }; POST /api/extension/oauth → exchange. */
const stubBackend = (exchange = { ok: true, body: {} }) => {
    globalThis.fetch = async (url, init) => {
        if (String(url).includes('/api/extension/oauth/authorize')) {
            return {
                ok: true,
                json: async () => ({
                    authorizationUrl: 'https://accounts.google.com/o/oauth2',
                }),
            }
        }
        if (String(url).includes('/api/extension/oauth')) {
            lastExchange = {
                url: String(url),
                method: init?.method,
                body: JSON.parse(init?.body || '{}'),
            }
            return { ok: exchange.ok, json: async () => exchange.body }
        }
        return { ok: true, json: async () => ({}) }
    }
}

const clickGoogle = async () => {
    document.getElementById('googleSignInBtn').click()
    for (let i = 0; i < 8; i++) await new Promise(r => setTimeout(r, 20))
}

beforeEach(async () => {
    lastExchange = null
    syncData = {}
    globalThis.currentBrowser.storage.sync.get = (_k, cb) => cb({ ...syncData })
    globalThis.currentBrowser.storage.sync.set = (items, cb) => {
        Object.assign(syncData, items)
        if (cb) cb()
    }
    globalThis.currentBrowser.storage.sync.remove = (keys, cb) => {
        for (const k of [].concat(keys)) delete syncData[k]
        if (cb) cb()
    }
    await renderSignInPrompt()
})

describe('popup OAuth — the success path', () => {
    it('exchanges the provider code, with the state and redirect the backend needs to verify it', async () => {
        withIdentity(
            'https://ext-id.chromiumapp.org/?code=AUTH_CODE_123&state=SIGNED_STATE',
        )
        stubBackend({
            ok: true,
            body: { token: 'sess-token', username: 'aladdin', image: null },
        })

        await clickGoogle()

        expect(lastExchange, 'the exchange request was made').not.toBeNull()
        expect(lastExchange.method).toBe('POST')
        expect(lastExchange.url).toMatch(/\/api\/extension\/oauth$/)
        expect(lastExchange.body).toMatchObject({
            provider: 'google',
            code: 'AUTH_CODE_123',
            // Dropping either of these silently disables the backend's ability
            // to bind the callback to the request that started it.
            state: 'SIGNED_STATE',
            redirectUri: 'https://ext-id.chromiumapp.org/',
        })
    })

    it('persists the returned session so the popup comes back signed in', async () => {
        withIdentity('https://ext-id.chromiumapp.org/?code=C&state=S')
        stubBackend({
            ok: true,
            body: { token: 'sess-token', username: 'aladdin', image: null },
        })

        await clickGoogle()

        expect(syncData.token).toBe('sess-token')
        expect(syncData.user).toEqual({ username: 'aladdin', image: null })
    })

    it('never banks a session when the provider returns an error instead of a code', async () => {
        withIdentity(
            'https://ext-id.chromiumapp.org/?error=access_denied&state=S',
        )
        stubBackend()

        await clickGoogle()

        expect(lastExchange, 'no code means no exchange attempt').toBeNull()
        expect(syncData.token).toBeUndefined()
        expect(
            document.getElementById('loginErrorMessage').textContent,
        ).toMatch(/access_denied/)
    })

    it("surfaces the backend's own reason when the exchange is rejected, and stays signed out", async () => {
        withIdentity('https://ext-id.chromiumapp.org/?code=C&state=S')
        stubBackend({ ok: false, body: { error: 'Invalid OAuth state' } })

        await clickGoogle()

        expect(syncData.token).toBeUndefined()
        expect(
            document.getElementById('loginErrorMessage').textContent,
        ).toMatch(/Invalid OAuth state/)
    })
})
