import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getOnMessageListeners, loadExtensionSource } from './_load.mjs'

// Characterization pin (F-004), flipped by F-002 — background.js's
// chrome.runtime.onMessage handler no longer collapses a non-ok upstream
// HTTP response into an EMPTY success shape ({coupons:[]} / {supported:[]});
// it now returns {error: `HTTP <status>`}, mirroring the classifyCart
// convention already at background.js:100 (one way per thing). Consumers
// (shared-utils.js fetchCoupons throws on resp.error; the supported-stores
// caller falls back to its expired cache) already tolerate this shape.
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

describe('background.js onMessage handler — honest failure shaping on fetch failure (F-002)', () => {
    it('registers exactly one onMessage listener', () => {
        expect(typeof handler).toBe('function')
    })

    it('fetchCoupons: HTTP failure resolves to { error: "HTTP <status>" }, not a fake-empty success', async () => {
        const resp = await invoke({
            action: 'fetchCoupons',
            site: 'example.com',
        })
        expect(resp).toEqual({ error: 'HTTP 500' })
    })

    it('fetchSupportedStores: HTTP failure resolves to { error: "HTTP <status>" }, not a fake-empty success', async () => {
        const resp = await invoke({ action: 'fetchSupportedStores' })
        expect(resp).toEqual({ error: 'HTTP 500' })
    })
})

describe('background.js onMessage handler — trust-loop reportOutcome branch (W2)', () => {
    // Recording fetch: the reportOutcome branch is fire-and-forget (the branch
    // never awaits the POSTs), but fetchWithTimeout calls fetch() synchronously,
    // so both calls are recorded before sendResponse resolves invoke().
    let calls
    beforeEach(() => {
        calls = []
        globalThis.fetch = async (url, opts) => {
            calls.push({ url: String(url), opts })
            return { ok: true, status: 200, json: async () => ({}) }
        }
    })

    it('worked: POSTs the report AND bumps the usage counter (storeReason omitted from the body)', async () => {
        const resp = await invoke({
            action: 'reportOutcome',
            id: '42',
            outcome: 'worked',
        })
        expect(resp).toEqual({ success: true })

        const report = calls.find(c => c.url.includes('/api/coupons/42/report'))
        expect(report).toBeTruthy()
        expect(report.opts.method).toBe('POST')
        expect(JSON.parse(report.opts.body)).toEqual({ outcome: 'worked' })

        const increment = calls.find(c =>
            c.url.includes('/api/coupons/increment'),
        )
        expect(increment).toBeTruthy()
        expect(increment.opts.method).toBe('POST')
        expect(JSON.parse(increment.opts.body)).toEqual({ id: '42' })
    })

    it('failed: POSTs the report with storeReason and does NOT bump the counter', async () => {
        const resp = await invoke({
            action: 'reportOutcome',
            id: '42',
            outcome: 'failed',
            storeReason: 'Expired',
        })
        expect(resp).toEqual({ success: true })

        const report = calls.find(c => c.url.includes('/api/coupons/42/report'))
        expect(report).toBeTruthy()
        expect(report.opts.method).toBe('POST')
        expect(JSON.parse(report.opts.body)).toEqual({
            outcome: 'failed',
            storeReason: 'Expired',
        })

        expect(
            calls.find(c => c.url.includes('/api/coupons/increment')),
        ).toBeFalsy()
    })
})
