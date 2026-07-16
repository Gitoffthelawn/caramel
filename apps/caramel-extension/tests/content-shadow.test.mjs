import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
    EXT_ROOT,
    loadExtensionSource,
    loadExtensionSources,
} from './_load.mjs'

// Phase 3 pins (Shadow DOM migration of the injected UI) — the two contracts
// that must never drift:
//   1. store-detect.js checks document.getElementById('caramel-small-prompt'
//      / 'caramel-testing-overlay' / 'caramel-final-overlay') for presence,
//      so each surface keeps a LIGHT-DOM HOST element with that exact id on
//      document.body …
//   2. … while ALL visuals live inside the host's OPEN shadow root
//      (host-page CSS can't reach them), and UI-helpers' own lookups
//      (caramel-test-status, caramel-progress-bar, …) resolve through it.
// jsdom implements attachShadow/shadowRoot (and composed event bubbling), so
// these run against the same harness as the other content-script suites.

let insertCaramelPrompt
let showTestingModal
let updateTestingModal
let hideTestingModal
let showFinalModal

beforeAll(() => {
    // Real load order (manifest.json): constants first, then the split files
    // (UI-helpers.js needs caramel-base.js's currentBrowser/log and
    // coupon-runner.js's _caramelCancelled realm-global).
    loadExtensionSource('coupon-constants.generated.js', [])
    ;({
        insertCaramelPrompt,
        showTestingModal,
        updateTestingModal,
        hideTestingModal,
        showFinalModal,
    } = loadExtensionSources(
        [
            'caramel-base.js',
            'dom-utils.js',
            'store-detect.js',
            'coupon-apply.js',
            'coupon-fetch.js',
            'coupon-runner.js',
            'UI-helpers.js',
        ],
        [
            'insertCaramelPrompt',
            'showTestingModal',
            'updateTestingModal',
            'hideTestingModal',
            'showFinalModal',
        ],
    ))

    // The shadow-CSS loader fetches runtime.getURL('assets/…') once. The
    // permissive chrome stub's getURL returns undefined, so make it identity
    // and serve the REAL stylesheet files from disk — the tests then pin the
    // actual :root → :host rewrite against the shipped tokens.css.
    globalThis.currentBrowser.runtime.getURL = p => p
    globalThis.fetch = async relPath => ({
        ok: true,
        text: async () => readFileSync(join(EXT_ROOT, relPath), 'utf8'),
    })
})

beforeEach(() => {
    document.body.innerHTML = ''
    globalThis._caramelCancelled = false
})

describe('UI-helpers.js — Shadow DOM hosts (Phase 3)', () => {
    it('showTestingModal mounts host #caramel-testing-overlay with the modal inside its shadow root', async () => {
        await showTestingModal()

        // (1) store-detect.js presence contract — plain getElementById works.
        const host = document.getElementById('caramel-testing-overlay')
        expect(host).not.toBeNull()
        expect(host.parentNode).toBe(document.body)

        // (2) visuals live in the shadow tree, NOT the page's light DOM.
        expect(host.children.length).toBe(0)
        const root = host.shadowRoot
        expect(root).not.toBeNull()
        expect(root.querySelector('#caramel-testing-modal')).not.toBeNull()
        expect(root.querySelector('#caramel-test-status')).not.toBeNull()
        expect(root.querySelector('#caramel-progress-bar')).not.toBeNull()
        // Tokens injected with the :root → ':host, :root' rewrite so --cm-*
        // vars resolve inside the shadow tree.
        const styleText = root.querySelector('style').textContent
        expect(styleText).toContain(':host, :root')
        expect(styleText).toContain('--cm-brand')
    })

    it('updateTestingModal updates status text and progress width through the shadow root', async () => {
        await showTestingModal()
        await updateTestingModal(2, 4, 'SAVE10')

        const root = document.getElementById(
            'caramel-testing-overlay',
        ).shadowRoot
        expect(
            root.querySelector('#caramel-test-status').textContent,
        ).toContain('Trying coupon 2 of 4 (SAVE10)')
        expect(root.querySelector('#caramel-progress-bar').style.width).toBe(
            '50%',
        )
    })

    it('hideTestingModal removes the host (getElementById resolves null again)', async () => {
        await showTestingModal()
        hideTestingModal()
        expect(document.getElementById('caramel-testing-overlay')).toBeNull()
    })

    it('Escape closes the testing modal via the document listener and sets the cancel flag', async () => {
        await showTestingModal()
        document.dispatchEvent(
            new window.KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
            }),
        )
        expect(document.getElementById('caramel-testing-overlay')).toBeNull()
        expect(globalThis._caramelCancelled).toBe(true)
    })

    it('showFinalModal mounts host #caramel-final-overlay; the OK button (shadow) closes it', async () => {
        await showFinalModal(5.5, 'SAVE10')

        const host = document.getElementById('caramel-final-overlay')
        expect(host).not.toBeNull()
        expect(host.children.length).toBe(0)
        const root = host.shadowRoot
        const modal = root.querySelector('.caramel-final-modal')
        expect(modal).not.toBeNull()
        expect(modal.getAttribute('role')).toBe('dialog')
        expect(root.querySelector('.caramel-final-code span').textContent).toBe(
            'SAVE10',
        )

        root.querySelector('#caramel-final-ok-btn').click()
        expect(document.getElementById('caramel-final-overlay')).toBeNull()
    })

    it('final-modal focus trap engages on Tab (cycles within the shadow root, never the page)', async () => {
        // Manual-code list → multiple focusables inside the dialog.
        await showFinalModal(0, null, null, false, [
            { code: 'AAA' },
            { code: 'BBB' },
        ])
        const root = document.getElementById('caramel-final-overlay').shadowRoot
        const modal = root.querySelector('.caramel-final-modal')

        const tab = new window.KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
        })
        modal.dispatchEvent(tab)
        // Trap took over the move (jsdom doesn't implement sequential focus
        // navigation itself, so defaultPrevented is the observable pin).
        expect(tab.defaultPrevented).toBe(true)

        const otherKey = new window.KeyboardEvent('keydown', {
            key: 'a',
            bubbles: true,
            cancelable: true,
        })
        modal.dispatchEvent(otherKey)
        expect(otherKey.defaultPrevented).toBe(false)
    })

    it('insertCaramelPrompt mounts host #caramel-small-prompt (role=button) with the pill in its shadow root; the × dismisses without starting the flow', async () => {
        await insertCaramelPrompt({ domain: 'example.com' })

        const host = document.getElementById('caramel-small-prompt')
        expect(host).not.toBeNull()
        expect(host.getAttribute('role')).toBe('button')
        expect(host.getAttribute('tabindex')).toBe('0')
        expect(host.children.length).toBe(0)
        const root = host.shadowRoot
        expect(root.querySelector('.cm-prompt')).not.toBeNull()

        // Second insert while one is showing stays a no-op (guard intact).
        await insertCaramelPrompt({ domain: 'example.com' })
        expect(document.querySelectorAll('#caramel-small-prompt').length).toBe(
            1,
        )

        // × dismisses; stopPropagation keeps the apply flow from starting
        // (no testing overlay may appear afterwards).
        root.querySelector('#caramel-close-btn').click()
        expect(document.getElementById('caramel-small-prompt')).toBeNull()
        await Promise.resolve()
        expect(document.getElementById('caramel-testing-overlay')).toBeNull()
    })
})
