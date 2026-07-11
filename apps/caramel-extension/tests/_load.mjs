// Shared test harness (F-004): loads a plain <script>-global extension
// source file (shared-utils.js, background.js — no import/export) into the
// current jsdom `window` via read-file + `(0,eval)`, the same trick the
// Playwright e2e suite already uses against a real browser page
// (scripts/test-extension.mjs:209-250, chrome stub shape at :238-248).
//
// The chrome stub here is a permissive Proxy rather than that exact
// hand-enumerated shape: shared-utils.js is a 1536-line file with far more
// surface than the applyCoupon() path the e2e suite exercises (it also
// touches chrome.storage.local, chrome.runtime.getManifest, etc. at module
// scope), so anything not explicitly known is a safe callable no-op instead
// of a ReferenceError/TypeError that would abort the whole-file eval.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const EXT_ROOT = path.resolve(__dirname, '..')

function makeChromeStub() {
    const cache = new WeakMap()
    function wrap(target) {
        if (cache.has(target)) return cache.get(target)
        const proxy = new Proxy(target, {
            get(obj, prop) {
                if (prop === 'then' || typeof prop === 'symbol') {
                    return undefined
                }
                if (!(prop in obj)) {
                    obj[prop] = wrap(function () {})
                }
                return obj[prop]
            },
            apply() {
                return undefined
            },
        })
        cache.set(target, proxy)
        return proxy
    }
    return wrap(function chromeStubRoot() {})
}

// Populated by installChromeStub() each call; exposed via
// getOnMessageListeners() for tests that need to invoke a source file's
// registered chrome.runtime.onMessage handler directly.
let onMessageListeners = []

/**
 * Installs a fresh permissive chrome/browser stub on globalThis (and
 * window, belt-and-suspenders — vitest's jsdom environment keeps the two
 * in sync, but the source under test only ever checks the bare identifier).
 *
 * runtime.onMessage.addListener/removeListener are the one deliberate
 * exception to "everything is a no-op": they record real listeners so
 * tests can retrieve and invoke them (see getOnMessageListeners()).
 */
export function installChromeStub() {
    const stub = makeChromeStub()
    const listeners = []
    stub.runtime.onMessage.addListener = fn => listeners.push(fn)
    stub.runtime.onMessage.removeListener = fn => {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
    }
    stub.runtime.onMessage.hasListener = fn => listeners.includes(fn)
    onMessageListeners = listeners

    globalThis.chrome = stub
    globalThis.browser = undefined
    if (typeof window !== 'undefined') {
        window.chrome = stub
        window.browser = undefined
    }
    return stub
}

/** Listeners registered via chrome.runtime.onMessage.addListener since the
 * last installChromeStub() call (loadExtensionSource() calls it once). */
export function getOnMessageListeners() {
    return onMessageListeners
}

/**
 * Reads `fileName` from the extension root and evaluates it via indirect
 * eval (global scope, matching how a <script> tag would run it). Appends a
 * capture expression so callers grab exactly the bindings they need off
 * `globalThis.__caramelTestExports` — explicit capture, not reliance on
 * global leakage from the eval'd top-level var/function declarations.
 *
 * @param {string} fileName - source file relative to the extension root
 * @param {string[]} exportNames - identifiers to capture after evaluating
 * @returns {Record<string, unknown>} the captured bindings
 */
export function loadExtensionSource(fileName, exportNames) {
    installChromeStub()

    const src = readFileSync(path.join(EXT_ROOT, fileName), 'utf8')
    const capture = `;globalThis.__caramelTestExports = { ${exportNames.join(', ')} };`

    // <script>-global source file the same way the browser would.
    ;(0, eval)(src + capture)

    return globalThis.__caramelTestExports
}
