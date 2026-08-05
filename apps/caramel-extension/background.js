const currentBrowser = (() => {
    if (typeof chrome !== 'undefined') return chrome // Chrome and Chromium-based browsers
    if (typeof browser !== 'undefined') return browser // Firefox
    throw new Error('Browser is not supported!')
})()

// Dev detection WITHOUT the `management` permission: packed Chrome Web Store
// builds carry an `update_url` in the manifest; unpacked dev installs don't.
// This is synchronous, so the base URL is correct before the first message is
// handled (the old chrome.management.getSelf callback raced inbound messages).
const _isDevInstall = () => {
    try {
        return !currentBrowser.runtime.getManifest().update_url
    } catch {
        return false
    }
}
// Unpacked/dev installs hit the DEV deployment (dev.grabcaramel.com); the
// packed Web Store build (has update_url) hits production.
globalThis.CARAMEL_BASE_URL = _isDevInstall()
    ? 'https://dev.grabcaramel.com'
    : 'https://grabcaramel.com'
const caramelUrl = path =>
    new URL(path, `${globalThis.CARAMEL_BASE_URL}/`).toString()

const FETCH_TIMEOUT_MS = 8000
function fetchWithTimeout(url, opts = {}) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() =>
        clearTimeout(timer),
    )
}

/* --------------------------------------------------  session bearer
 * Popup login stores the session token in storage.sync (`token`). Every
 * caramel API call attaches it as `Authorization: Bearer` so the backend
 * can tie coupon fetches and outcome reports to the account. The token is
 * read fresh per request — the MV3 service worker restarts constantly, so
 * a module-global cache would silently go stale (or start empty) after a
 * restart. Signed-out users fetch exactly as before (no header). */
function getStoredToken() {
    return new Promise(resolve => {
        try {
            // READ-ONLY twin of caramel-base.js's caramelGetSession(). The
            // session lives in storage.LOCAL so the credential does not roam
            // via Chrome Sync; sync is still read as a fallback for installs
            // that predate that move. This worker cannot load caramel-base.js
            // (service worker, no `window`), hence the deliberate duplicate —
            // but only the READ, so the migration write stays in one place:
            // the popup or a content script performs it the first time either
            // runs, which is immediately in any real session.
            currentBrowser.storage.local.get(['token'], local => {
                if (currentBrowser.runtime.lastError) {
                    resolve(null)
                    return
                }
                if (local?.token) {
                    resolve(local.token)
                    return
                }
                currentBrowser.storage.sync.get(['token'], synced => {
                    if (currentBrowser.runtime.lastError) {
                        resolve(null)
                        return
                    }
                    resolve(synced?.token || null)
                })
            })
        } catch {
            resolve(null)
        }
    })
}

async function fetchCaramelApi(url, opts = {}) {
    const token = await getStoredToken()
    if (!token) return fetchWithTimeout(url, opts)
    return fetchWithTimeout(url, {
        ...opts,
        headers: { ...opts.headers, Authorization: `Bearer ${token}` },
    })
}

function isServiceWorkerContext() {
    return (
        typeof ServiceWorkerGlobalScope !== 'undefined' &&
        self instanceof ServiceWorkerGlobalScope
    )
}

// Detect if we're in a service worker context or traditional background script
// This is needed to support Firefox (MV2) and Chromium/Safari browsers (MV3)
const isServiceWorker = isServiceWorkerContext()

// Keep-Alive Mechanism
function keepAlive() {
    if (isServiceWorker) {
        // For service workers, use chrome.alarms to keep alive
        try {
            currentBrowser.alarms.create('keepAlive', { periodInMinutes: 1 })

            currentBrowser.alarms.onAlarm.addListener(alarm => {
                if (alarm.name === 'keepAlive') {
                    // Service worker is alive - periodic check
                }
            })
        } catch {
            // Fallback if alarms API is not available
        }
    } else {
        // For traditional background scripts, use setInterval
        setInterval(() => {
            // Background script is alive - periodic check
        }, 10000) // Check every 10 seconds
    }
}

keepAlive()

/* --------------------------------------------------  toolbar badge
 * Shows how many coupons exist for the site in the active tab, so the
 * user knows to open Caramel before they reach checkout. Counts come
 * from the public coupons endpoint (limit=1 — only `total` is read),
 * cached per domain so tab switching doesn't refetch. Deliberately
 * anonymous (fetchWithTimeout, no bearer): it's a public aggregate that
 * fires on every tab switch, nothing user-scoped to gain. */
const BADGE_CACHE_TTL_MS = 10 * 60 * 1000
const _badgeCounts = new Map() // domain -> { count, ts }

try {
    currentBrowser.action.setBadgeBackgroundColor({ color: '#ea6925' })
    if (currentBrowser.action.setBadgeTextColor)
        currentBrowser.action.setBadgeTextColor({ color: '#ffffff' })
} catch {
    /* badge styling unsupported — counts still render */
}

function _setBadge(tabId, count) {
    const text = count > 0 ? (count > 99 ? '99+' : String(count)) : ''
    try {
        currentBrowser.action.setBadgeText({ tabId, text })
    } catch {
        /* tab gone before the count arrived */
    }
}

async function _couponCountFor(domain) {
    const hit = _badgeCounts.get(domain)
    if (hit && Date.now() - hit.ts < BADGE_CACHE_TTL_MS) return hit.count
    const url = new URL(caramelUrl('api/coupons'))
    url.searchParams.set('site', domain)
    url.searchParams.set('limit', '1')
    let count = 0
    try {
        const r = await fetchWithTimeout(url.toString())
        if (r.ok) {
            const json = await r.json()
            count =
                typeof json.total === 'number'
                    ? json.total
                    : (json.coupons || []).length
        }
    } catch {
        // Offline/unreachable — treat as no badge, retry after TTL.
    }
    _badgeCounts.set(domain, { count, ts: Date.now() })
    return count
}

async function updateBadgeForTab(tabId, tabUrl) {
    if (!tabId || !tabUrl || !/^https?:/.test(tabUrl)) {
        _setBadge(tabId, 0)
        return
    }
    let domain
    try {
        domain = new URL(tabUrl).hostname.replace(/^www\./, '')
    } catch {
        _setBadge(tabId, 0)
        return
    }
    const count = await _couponCountFor(domain)
    _setBadge(tabId, count)
}

currentBrowser.tabs.onActivated.addListener(({ tabId }) => {
    currentBrowser.tabs.get(tabId, tab => {
        if (currentBrowser.runtime.lastError || !tab) return
        updateBadgeForTab(tabId, tab.url || '')
    })
})
currentBrowser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Fire on navigation commit (URL change) and on load completion —
    // covers SPA address-bar updates that never re-"complete".
    if (!changeInfo.url && changeInfo.status !== 'complete') return
    updateBadgeForTab(tabId, tab.url || '')
})

currentBrowser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (!message || typeof message.action !== 'string') return
        if (message.action === 'openPopup') {
            currentBrowser.windows.create({
                url: currentBrowser.runtime.getURL(
                    'index.html?isPopup=true&callerId=' +
                        (sender.tab?.id ?? ''),
                ),
                type: 'popup',
                width: 400,
                height: 450,
            })
            sendResponse({ success: true })
        } else if (message.action.startsWith('userLoggedInFromPopup_')) {
            const callerId = message.action.split('_')[1]
            currentBrowser.tabs.sendMessage(parseInt(callerId), {
                action: 'userLoggedIn',
            })
            sendResponse({ success: true })
        } else if (message.action === 'keepAlive') {
            sendResponse({ status: 'alive' }) // Respond to the message
        } else if (message.action === 'classifyCart') {
            fetchCaramelApi(caramelUrl('api/classify-cart'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message.signals || {}),
            })
                .then(async r => {
                    if (!r.ok) return { error: `HTTP ${r.status}` }
                    return r.json()
                })
                .then(resp => sendResponse(resp))
                .catch(err => {
                    console.error('classifyCart error', err)
                    sendResponse({ error: String(err) })
                })

            return true
        } else if (message.action === 'fetchCoupons') {
            const { site, kw, category } = message
            const url = new URL(caramelUrl('api/coupons'))
            url.searchParams.set('site', site)
            url.searchParams.set('key_words', kw || '')
            url.searchParams.set('limit', '20')
            if (category) url.searchParams.set('category', category)
            if (_isDevInstall())
                console.log('BACKGROUND: fetchCoupons', {
                    site,
                    kw,
                    url: url.toString(),
                    t: Date.now(),
                })
            fetchCaramelApi(url.toString())
                .then(async r => {
                    if (!r.ok) return { error: `HTTP ${r.status}` }
                    const json = await r.json()
                    return {
                        coupons: Array.isArray(json)
                            ? json
                            : json.coupons || [],
                    }
                })
                .then(resp => sendResponse(resp))
                .catch(err => sendResponse({ coupons: [], error: String(err) }))

            return true
        } else if (message.action === 'reportOutcome') {
            // Trust-loop signal from the apply flow (coupon-runner). Fire-and-forget:
            // errors are logged, never surfaced — a report must not break checkout.
            // A "worked" outcome also bumps the public usage counter.
            const { id, outcome, storeReason } = message
            fetchCaramelApi(caramelUrl(`api/coupons/${id}/report`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome, storeReason }),
            }).catch(err => console.error('reportOutcome error', err))
            if (outcome === 'worked') {
                fetchCaramelApi(caramelUrl('api/coupons/increment'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id }),
                }).catch(err => console.error('increment error', err))
            }
            sendResponse({ success: true })
            return true
        } else if (message.action === 'fetchSupportedStores') {
            const url = caramelUrl('api/extension/supported-stores')
            fetchCaramelApi(url)
                .then(async r => {
                    if (!r.ok) return { error: `HTTP ${r.status}` }
                    return r.json()
                })
                .then(resp => sendResponse(resp))
                .catch(err => {
                    console.error('fetchSupportedStores error', err)
                    sendResponse({ supported: [], error: String(err) })
                })

            return true
        } else if (message.action === 'getActiveTabDomainRecord') {
            currentBrowser.tabs.query(
                { active: true, lastFocusedWindow: true },
                tabs => {
                    if (!tabs || !tabs.length) {
                        sendResponse({ domainRecord: null, url: null })
                        return
                    }

                    const tab = tabs[0]
                    const tabUrl = tab.url || ''

                    // Don't inject into extension pages (popup, options, etc.)
                    if (
                        tabUrl.startsWith('chrome-extension://') ||
                        tabUrl.startsWith('moz-extension://') ||
                        tabUrl.startsWith('safari-web-extension://')
                    ) {
                        // For extension pages, just return the URL without injecting
                        try {
                            const url = new URL(tabUrl)
                            sendResponse({
                                domainRecord: null,
                                url: url.hostname,
                            })
                        } catch {
                            sendResponse({ domainRecord: null, url: null })
                        }
                        return
                    }

                    // Content scripts are injected by manifest. Use tab URL directly
                    // to avoid reinjection and duplicate declaration errors.
                    try {
                        const hostname = tabUrl
                            ? new URL(tabUrl).hostname
                            : null
                        sendResponse({ domainRecord: null, url: hostname })
                    } catch (err) {
                        console.error(
                            'Error getting hostname from tab URL:',
                            err,
                        )
                        sendResponse({ domainRecord: null, url: null })
                    }
                },
            )

            return true
        } else {
            // Unknown action — respond so the caller's promise never hangs.
            sendResponse({ error: 'unknown_action' })
        }
    },
)
