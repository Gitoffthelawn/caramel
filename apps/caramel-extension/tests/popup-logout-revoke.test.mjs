import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { loadExtensionSource, loadExtensionSources } from './_load.mjs'

// "Log out" used to be `storage.sync.remove(['token','user'])` and nothing
// else, in all three places it appears. The bearer it forgot locally stayed
// valid server-side for the rest of its 7-day life, so a token captured before
// logout still authenticated afterwards — and no endpoint existed that could
// have revoked it. DELETE /api/extension/session is that endpoint; this pins
// that the popup actually calls it.
//
// The second half matters as much as the first: logging out must still work
// when the revoke cannot be delivered. Someone offline who presses "log out"
// has to end up logged out on this device, so the local clear is unconditional
// — but it must not be reordered ahead of the revoke, or the token needed to
// authenticate the revoke would already be gone.
let initPopup
let syncData
let requests
let revokeResponse

const flush = async () => {
    for (let i = 0; i < 12; i++) await new Promise(r => setTimeout(r, 0))
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
        requests.push({ removedAt: requests.length, keys: [].concat(keys) })
        for (const key of [].concat(keys)) delete syncData[key]
        if (cb) cb()
    }
    ;({ initPopup } = loadExtensionSource('popup.js', ['initPopup']))
})

beforeEach(() => {
    syncData = { token: 'live-token', user: { username: 'fan', image: '' } }
    requests = []
    revokeResponse = { ok: true, status: 200, json: async () => ({}) }
    globalThis.fetch = async (url, init) => {
        const href = String(url)
        if (href.includes('/api/extension/session')) {
            requests.push({
                revoke: { method: init?.method, headers: init?.headers },
            })
            if (revokeResponse instanceof Error) throw revokeResponse
            return revokeResponse
        }
        // the /me probe initPopup fires in parallel
        return { ok: true, status: 200, json: async () => ({}) }
    }
})

/** Renders the signed-in popup and presses its Log out button. */
const logOut = async () => {
    await initPopup()
    await flush()
    const btn = document.getElementById('logoutBtn')
    expect(btn, 'the signed-in popup rendered a logout button').toBeTruthy()
    btn.click()
    await flush()
}

const revokeCall = () => requests.find(r => r.revoke)?.revoke
const removal = () => requests.find(r => r.keys)

describe('popup logout — revoking the session, not just forgetting it', () => {
    it('sends DELETE to /api/extension/session with the stored bearer', async () => {
        await logOut()

        expect(revokeCall(), 'a revoke request was sent').toBeTruthy()
        expect(revokeCall().method).toBe('DELETE')
        expect(revokeCall().headers.Authorization).toBe('Bearer live-token')
    })

    it('revokes BEFORE clearing storage, so the token is still there to authenticate with', async () => {
        await logOut()

        const revokeIndex = requests.findIndex(r => r.revoke)
        const removeIndex = requests.findIndex(r => r.keys)
        expect(revokeIndex).toBeGreaterThanOrEqual(0)
        expect(removeIndex).toBeGreaterThanOrEqual(0)
        expect(revokeIndex).toBeLessThan(removeIndex)
    })

    it('clears the local session once the revoke completes', async () => {
        await logOut()

        expect(removal().keys).toEqual(['token', 'user'])
        expect(syncData.token).toBeUndefined()
        expect(syncData.user).toBeUndefined()
    })

    it('still logs the user out on this device when the revoke is unreachable', async () => {
        revokeResponse = new Error('Failed to fetch')

        await logOut()

        expect(revokeCall(), 'the revoke was attempted').toBeTruthy()
        expect(
            syncData.token,
            'offline must not trap the user signed in',
        ).toBeUndefined()
    })

    it('still logs the user out when the backend rejects the revoke', async () => {
        revokeResponse = { ok: false, status: 500, json: async () => ({}) }

        await logOut()

        expect(syncData.token).toBeUndefined()
    })

    // The popup renders THREE different signed-in views, each with its own
    // logout button, and the tests above can only drive one of them. All three
    // used to clear storage directly; they now share signOutAndRevoke(). A
    // future edit that inlines the storage clear back into one of them would
    // silently restore the un-revokable session for that view alone, and no
    // behavioural test here would notice — so guard it at the source.
    it('leaves no logout path that clears the session without revoking it', () => {
        const src = readFileSync(
            join(dirname(fileURLToPath(import.meta.url)), '..', 'popup.js'),
            'utf8',
        )
        const clears =
            src.match(/storage\.sync\.remove\(\s*\[\s*'token'/g) ?? []
        // Exactly two legitimate sites remain:
        //   1. signOutAndRevoke's own clearLocal, after the revoke.
        //   2. validateStoredSession's 401 branch — that token is ALREADY dead
        //      server-side, so there is nothing left to revoke.
        expect(
            clears,
            'a third token-clearing site means some logout path skips revocation',
        ).toHaveLength(2)
        expect(src).toContain('function signOutAndRevoke(')
    })
})
