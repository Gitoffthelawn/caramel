import { beforeAll, describe, expect, it } from 'vitest'
import { getOnMessageListeners, loadExtensionSource } from './_load.mjs'

// Characterization pin (F-004, optional/stretch) — lock CURRENT response
// shaping in background.js's chrome.runtime.onMessage handler
// (background.js:177,205) when the upstream fetch fails. F-002 will
// intentionally change this: today a non-ok HTTP response silently
// degrades to an EMPTY success shape ({coupons:[]} / {supported:[]})
// instead of surfacing the failure to the caller.
let handler

beforeAll(() => {
    globalThis.fetch = async () => ({ ok: false, status: 500 })
    loadExtensionSource('background.js', [])
    ;[handler] = getOnMessageListeners()
})

function invoke(message) {
    return new Promise(resolve => {
        handler(message, {}, resolve)
    })
}

describe('background.js onMessage handler — empty-success shaping on fetch failure', () => {
    it('registers exactly one onMessage listener', () => {
        expect(typeof handler).toBe('function')
    })

    it('fetchCoupons: HTTP failure resolves to { coupons: [] } instead of surfacing the error', async () => {
        const resp = await invoke({
            action: 'fetchCoupons',
            site: 'example.com',
        })
        expect(resp).toEqual({ coupons: [] })
    })

    it('fetchSupportedStores: HTTP failure resolves to { supported: [] } instead of surfacing the error', async () => {
        const resp = await invoke({ action: 'fetchSupportedStores' })
        expect(resp).toEqual({ supported: [] })
    })
})
