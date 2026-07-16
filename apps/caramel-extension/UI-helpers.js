//UI HELPERS
//
// Phase 3: each injected surface is a LIGHT-DOM HOST <div> with the
// historical id (caramel-small-prompt / caramel-testing-overlay /
// caramel-final-overlay) on document.body — store-detect.js getElementById
// presence checks keep working — with ALL visuals in its open shadow root.
// Styles: assets/content-ui.css + assets/tokens.css (web_accessible in BOTH
// manifests) fetched ONCE, tokens rewritten ':root' → ':host, :root', one
// <style> per shadow root, awaited before append (no unstyled flash).
// Embedding the CSS as a JS string was rejected: the summed content-script
// size budget (.size-limit.json, 102 KB) counts JS bytes, not fetched CSS.

// Inline SVG close glyph (stroke follows the button's currentColor).
const CARAMEL_X_ICON =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>'

// Functional-minimum styles used ONLY when the stylesheet fetch fails.
const CARAMEL_UI_FALLBACK_CSS =
    '.cm-scrim{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,12,10,.5)}' +
    '#caramel-testing-modal,.caramel-final-modal{background:#fff;color:#111;padding:24px;border-radius:16px;font-family:sans-serif;text-align:center}' +
    '.cm-prompt{background:#ea6925;color:#fff;padding:14px;border-radius:16px;font-family:sans-serif}'

// Host positioning, applied INLINE — the authoritative cross-browser source
// (Firefox's manifest ships no content css; caramel-content.css repeats
// these as Chrome's light-DOM backup — keep in sync).
const CARAMEL_OVERLAY_HOST_CSS =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;z-index:2147483647;'
const CARAMEL_HOST_CSS = {
    'caramel-small-prompt':
        'position:fixed;top:max(20px,env(safe-area-inset-top));right:max(20px,env(safe-area-inset-right));z-index:2147483646;width:min(88vw,300px);cursor:pointer;outline:none;',
    'caramel-testing-overlay': CARAMEL_OVERLAY_HOST_CSS,
    'caramel-final-overlay': CARAMEL_OVERLAY_HOST_CSS,
}

// Cached across all three surfaces. Guarded `var` (re-injection convention).
if (typeof _caramelShadowCssPromise === 'undefined') {
    var _caramelShadowCssPromise = null
}
function _caramelGetShadowCss() {
    if (!_caramelShadowCssPromise) {
        _caramelShadowCssPromise = (async () => {
            const grab = async file => {
                const res = await fetch(currentBrowser.runtime.getURL(file))
                if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
                return res.text()
            }
            const [tokens, ui] = await Promise.all([
                grab('assets/tokens.css'),
                grab('assets/content-ui.css'),
            ])
            return tokens.replace(/:root/g, ':host, :root') + '\n' + ui
        })().catch(err => {
            log('CONTENT_UI_CSS_LOAD_FAILED', { error: String(err) })
            return CARAMEL_UI_FALLBACK_CSS
        })
    }
    return _caramelShadowCssPromise
}

/* Light-DOM host <div id=id> (inline positioning, no visuals) + OPEN shadow
 * root carrying the shared stylesheet. NOT appended — callers build into
 * `root`, wire listeners, then append the host, fully styled. */
async function createCaramelShadowHost(id) {
    const host = document.createElement('div')
    host.id = id
    host.style.cssText = CARAMEL_HOST_CSS[id] || ''
    const root = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = await _caramelGetShadowCss()
    root.appendChild(style)
    return { host, root }
}

/* Focus trap: Tab/Shift+Tab cycle within the shadow root's focusables,
 * never the host page. On the modal container — no document listener. */
function _caramelInstallFocusTrap(root, modal) {
    modal.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return
        const focusables = Array.from(
            root.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
        ).filter(el => !el.disabled)
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = root.activeElement
        if (e.shiftKey) {
            if (!active || active === first || active === modal) {
                e.preventDefault()
                last.focus()
            }
        } else if (!active || active === last || active === modal) {
            e.preventDefault()
            first.focus()
        }
    })
}

/* Restore focus to the pre-dialog element (stored on the host). */
function _caramelRestoreFocus(host) {
    const prev = host.__caramelPrevFocus
    if (prev && prev.isConnected && typeof prev.focus === 'function') {
        try {
            prev.focus()
        } catch {
            /* focus is best-effort */
        }
    }
}

/* -------------------------------------------------- UI prompt   */

// Concurrency guard: the shadow-host await lets two near-simultaneous
// inserts both pass the getElementById check before either host appends.
if (typeof _caramelPromptInFlight === 'undefined') {
    var _caramelPromptInFlight = false
}

// Called from store-detect.js — content_scripts share one global scope
// (manifest order, no ES modules), so per-file analysis misses the call.
// oxlint-disable-next-line no-unused-vars
async function insertCaramelPrompt(domainRecord) {
    if (
        document.getElementById('caramel-small-prompt') ||
        _caramelPromptInFlight
    )
        return
    _caramelPromptInFlight = true
    let made
    try {
        // Only the await needs the flag (the rest runs sync to appendChild).
        made = await createCaramelShadowHost('caramel-small-prompt')
    } finally {
        _caramelPromptInFlight = false
    }
    const { host, root } = made
    host.setAttribute('role', 'button')
    host.setAttribute('tabindex', '0')
    host.setAttribute(
        'aria-label',
        'Try Caramel Coupons — auto-apply the best code at checkout',
    )
    const logoUrl = currentBrowser.runtime.getURL('assets/logo-light.png')
    const pill = document.createElement('div')
    pill.className = 'cm-prompt'
    pill.innerHTML = `
<button id="caramel-close-btn" class="cm-close-fab" aria-label="Dismiss">${CARAMEL_X_ICON}</button>
<div class="caramel-prompt-row">
<img class="caramel-prompt-logo" src="${logoUrl}" alt=""/>
<div class="caramel-prompt-copy">
<div class="caramel-prompt-label">Try Caramel Coupons</div>
<small>Auto-apply the best code at checkout</small>
</div>
<svg class="caramel-prompt-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</div>
`
    root.appendChild(pill)

    const _dismiss = () => {
        if (host.parentNode) document.body.removeChild(host)
    }
    const _activate = () => {
        try {
            if (typeof log !== 'undefined')
                log('AUTO_INSERT_TRIGGERED_BY_UI', {
                    domain: domainRecord?.domain || location.hostname,
                    t: performance.now(),
                })
        } catch {
            // ignore
        }
        startApplyingCoupons(domainRecord).catch(err => {
            // A throw mid-flow must never leave the overlay trapping the page.
            console.error('Caramel: apply flow error', err)
            hideTestingModal()
        })
        _dismiss()
    }

    // The × listens INSIDE the shadow tree (host listeners only see the
    // RETARGETED target === host); stopPropagation keeps _activate out.
    root.querySelector('#caramel-close-btn').addEventListener(
        'click',
        event => {
            event.stopPropagation()
            _dismiss()
        },
    )
    host.addEventListener('click', _activate)
    // Keyboard parity (host is role="button"): composedPath()[0] is the
    // pre-retarget target — Enter on the focused × must only close.
    host.addEventListener('keydown', event => {
        if (
            event.composedPath()[0] === host &&
            (event.key === 'Enter' || event.key === ' ')
        ) {
            event.preventDefault()
            _activate()
        }
    })

    document.body.appendChild(host)
}

// Called from coupon-runner.js (cross-file, see insertCaramelPrompt).
// oxlint-disable-next-line no-unused-vars
async function showTestingModal(title = '', noLoading = false) {
    const prevFocus = document.activeElement
    const { host, root } = await createCaramelShadowHost(
        'caramel-testing-overlay',
    )

    const scrim = document.createElement('div')
    scrim.className = 'cm-scrim'

    const modal = document.createElement('div')
    modal.id = 'caramel-testing-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.setAttribute('aria-label', 'Applying coupons')

    const logoUrl = currentBrowser.runtime.getURL('assets/logo-light.png')

    const loadingHTML = `<p id="caramel-test-status">Checking this store for codes…</p>
<div id="caramel-progress-container"><div id="caramel-progress-bar"></div></div>`

    modal.innerHTML = `
<button id="caramel-testing-close" class="cm-close-fab" title="Stop" aria-label="Stop">${CARAMEL_X_ICON}</button>
<div class="caramel-modal-header">
<img class="caramel-modal-logo" src="${logoUrl}" alt="Caramel Logo" />
<h2>${title || 'Applying Coupons...'}</h2>
</div>
${noLoading ? '' : loadingHTML}`

    scrim.appendChild(modal)
    root.appendChild(scrim)
    host.__caramelPrevFocus = prevFocus
    document.body.appendChild(host)

    // Let the user bail out — never trap them behind the overlay.
    const _close = root.querySelector('#caramel-testing-close')
    if (_close)
        _close.addEventListener('click', () => {
            _caramelCancelled = true
            hideTestingModal()
        })
    // Esc cancels — on `document` so it works with focus on the page too.
    const onKey = e => {
        if (e.key === 'Escape') {
            _caramelCancelled = true
            hideTestingModal()
        }
    }
    host.__caramelOnKey = onKey
    document.addEventListener('keydown', onKey)
    _caramelInstallFocusTrap(root, modal)
    // Focus the dialog itself (a11y) — not the × (focus-ring flash).
    try {
        modal.tabIndex = -1
        modal.focus()
    } catch {
        /* focus is best-effort */
    }
}

/* Updates the testing modal's status text + progress bar width. */
// Called from coupon-runner.js (cross-file, see insertCaramelPrompt).
// oxlint-disable-next-line no-unused-vars
async function updateTestingModal(currentIndex, total, code) {
    const host = document.getElementById('caramel-testing-overlay')
    const root = host && host.shadowRoot
    if (!root) return

    const statusEl = root.querySelector('#caramel-test-status')
    if (statusEl) {
        statusEl.textContent = `Trying coupon ${currentIndex} of ${total} (${code})...`
    }

    const progressBar = root.querySelector('#caramel-progress-bar')
    if (progressBar && total > 0) {
        const progressPercent = Math.round((currentIndex / total) * 100)
        progressBar.style.width = `${progressPercent}%`
    }
}
function hideTestingModal() {
    const host = document.getElementById('caramel-testing-overlay')
    if (host) {
        if (host.__caramelOnKey)
            document.removeEventListener('keydown', host.__caramelOnKey)
        document.body.removeChild(host)
        _caramelRestoreFocus(host)
    }
}

/* Copies an exact coupon code: async clipboard API first, hidden
 * textarea + execCommand fallback for pages that block it. */
async function caramelCopyText(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // page may block the async clipboard API — fall through to execCommand
    }
    try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '-1000px'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
    } catch {
        return false
    }
}

// Called from coupon-runner.js + store-detect.js (cross-file, see
// insertCaramelPrompt).
// oxlint-disable-next-line no-unused-vars
async function showFinalModal(
    savingsAmount,
    code,
    message,
    isSignIn = false,
    couponList = [],
) {
    hideTestingModal()
    const prevFocus = document.activeElement
    const { host, root } = await createCaramelShadowHost(
        'caramel-final-overlay',
    )

    const scrim = document.createElement('div')
    scrim.className = 'cm-scrim'

    const modal = document.createElement('div')
    modal.className = 'caramel-final-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.setAttribute('aria-label', 'Caramel coupons')

    // Terminal states: savedMoney = real measured price drop; appliedCode =
    // code applied but savings unmeasurable (no priceContainer config —
    // still a win); noLuck = nothing applied (or signed-out/network error).
    const savedMoney = savingsAmount > 0
    const appliedCode = !savedMoney && !!code
    const isSuccess = savedMoney || appliedCode

    // Manual fallback: auto-apply found nothing but codes exist — checkouts
    // that ignore synthetic clicks (isTrusted) still take a hand-pasted
    // code, so offer a copy list.
    const manualCodes = (
        !isSuccess && Array.isArray(couponList) ? couponList : []
    )
        .filter(c => c && c.code)
        .slice(0, 8)
    const hasManual = manualCodes.length > 0

    const esc = s =>
        String(s == null ? '' : s).replace(
            /[&<>"']/g,
            ch =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                })[ch],
        )

    // Build the secondary message based on which state we landed in.
    let finalMessage
    if (savedMoney) {
        finalMessage = `We found a coupon that saves you $${savingsAmount.toFixed(2)}!`
    } else if (appliedCode) {
        // Caller message (threshold hints, non-USD) beats the generic line.
        finalMessage =
            message ||
            `Code ${esc(code)} is applied to your cart — review the discount before you check out.`
    } else if (hasManual) {
        // Caller message = the REAL reason, not a generic "didn't stick".
        finalMessage =
            message ||
            "Auto-apply didn't stick this time. Copy a code and paste it in the store's promo box."
    } else if (isSignIn) {
        finalMessage =
            message || 'Sign in to unlock member-only coupons for this store.'
    } else {
        finalMessage =
            message || "Looks like you're already getting the best deal."
    }

    const logoUrl = currentBrowser.runtime.getURL('assets/logo.png') // Adjust if needed

    const heading = savedMoney
        ? 'Savings Found'
        : appliedCode
          ? '✓ Coupon Applied'
          : isSignIn
            ? 'Sign in to continue'
            : hasManual
              ? 'Grab a code'
              : 'Heads up'

    const manualBlock = hasManual
        ? `<div class="caramel-manual-list">${manualCodes
              .map(
                  c => `<div class="caramel-manual-row">
<div class="caramel-manual-info">
<div class="caramel-manual-code">${esc(c.code)}</div>
${c.title ? `<div class="caramel-manual-title">${esc(c.title)}</div>` : ''}
</div>
<button class="caramel-manual-copy" data-code="${esc(c.code)}">Copy</button>
</div>`,
              )
              .join('')}</div>`
        : ''

    modal.innerHTML = `
<div class="caramel-final-logo"><img src="${logoUrl}" alt="Caramel Logo" /></div>
<h2>${heading}</h2>
<p class="caramel-final-msg">${finalMessage}</p>
${manualBlock}
${
    isSuccess
        ? `<p class="caramel-final-code">Code: <span>${esc(code)}</span></p>
${
    savedMoney
        ? `<p class="caramel-final-savings">You saved $${savingsAmount.toFixed(2)}!</p>`
        : `<p class="caramel-final-hint">Discount visible in your cart.</p>`
}`
        : ''
}
<button id="caramel-final-ok-btn">${isSignIn ? 'Sign In' : hasManual ? 'Done' : 'Proceed to Checkout'}</button>
`

    scrim.appendChild(modal)
    root.appendChild(scrim)
    host.__caramelPrevFocus = prevFocus
    document.body.appendChild(host)

    // Single close path — detaches the Esc listener (no leaked handler).
    const closeFinal = () => {
        if (host.__caramelOnKey)
            document.removeEventListener('keydown', host.__caramelOnKey)
        if (host.parentNode) document.body.removeChild(host)
        _caramelRestoreFocus(host)
    }

    // Manual-copy buttons: copies the EXACT code shown (data-code); copied
    // feedback = class toggle (tokened green pair, dark-safe).
    modal.querySelectorAll('.caramel-manual-copy').forEach(btn => {
        btn.addEventListener('click', async ev => {
            ev.stopPropagation()
            const cc = btn.getAttribute('data-code')
            const ok = await caramelCopyText(cc)
            const prev = btn.textContent
            btn.textContent = ok ? 'Copied!' : 'Press Ctrl+C'
            if (ok) btn.classList.add('is-copied')
            setTimeout(() => {
                btn.textContent = prev
                btn.classList.remove('is-copied')
            }, 1600)
        })
    })

    // Close on the primary button; Esc closes too (keyboard).
    const okBtn = modal.querySelector('#caramel-final-ok-btn')
    if (okBtn)
        okBtn.addEventListener('click', () => {
            closeFinal()
            if (isSignIn) {
                //show popup.html
                currentBrowser.runtime.sendMessage({ action: 'openPopup' })
            }
        })
    const onKey = e => {
        if (e.key === 'Escape') closeFinal()
    }
    host.__caramelOnKey = onKey
    document.addEventListener('keydown', onKey)
    _caramelInstallFocusTrap(root, modal)
    // Focus the modal container, not the primary button — no focus ring
    // flash on open; keyboard users Tab to the button (focus-visible ring).
    try {
        modal.tabIndex = -1
        modal.focus()
    } catch {
        /* focus is best-effort */
    }
}
