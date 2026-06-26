//UI HELPERS

// Inline icon set (Lucide-style strokes, no emoji). Guarded `var` so a second
// content-script injection into the same realm doesn't throw on redeclaration.
if (typeof CARAMEL_ICONS === 'undefined') {
    var CARAMEL_ICONS = {
        x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
        tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        spark: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11.2 3.5a.85.85 0 0 1 1.6 0l1.5 3.9a.85.85 0 0 0 .5.5l3.9 1.5a.85.85 0 0 1 0 1.6l-3.9 1.5a.85.85 0 0 0-.5.5l-1.5 3.9a.85.85 0 0 1-1.6 0l-1.5-3.9a.85.85 0 0 0-.5-.5l-3.9-1.5a.85.85 0 0 1 0-1.6l3.9-1.5a.85.85 0 0 0 .5-.5l1.5-3.9z"/><path d="M19 3.2c.13 0 .25.08.3.2l.5 1.3c.04.1.12.18.22.22l1.3.5a.32.32 0 0 1 0 .6l-1.3.5a.32.32 0 0 0-.22.22l-.5 1.3a.32.32 0 0 1-.6 0l-.5-1.3a.32.32 0 0 0-.22-.22l-1.3-.5a.32.32 0 0 1 0-.6l1.3-.5a.32.32 0 0 0 .22-.22l.5-1.3a.32.32 0 0 1 .3-.2z"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    }
}

/* -------------------------------------------------- UI prompt   */

async function insertCaramelPrompt(domainRecord) {
    if (document.getElementById('caramel-small-prompt')) return
    const container = document.createElement('div')
    container.id = 'caramel-small-prompt'
    const logoUrl = await currentBrowser.runtime.getURL('assets/logo-light.png')
    container.innerHTML = `
    <button id="caramel-close-btn" aria-label="Dismiss">${CARAMEL_ICONS.x}</button>
    <div class="caramel-prompt-body">
        <img class="caramel-prompt-logo" src="${logoUrl}" alt="Caramel"/>
        <div class="caramel-prompt-text">
            <div class="caramel-prompt-title">Coupons available</div>
            <div class="caramel-prompt-sub">${CARAMEL_ICONS.spark}Apply the best code automatically</div>
        </div>
    </div>
`

    container.addEventListener('click', event => {
        if (event.target.closest('#caramel-close-btn')) {
            // If the close button is clicked, just remove the popup
            document.body.removeChild(container)
            return
        }
        // If the container itself is clicked, start applying coupons
        try {
            if (typeof log !== 'undefined')
                log('AUTO_INSERT_TRIGGERED_BY_UI', {
                    domain: domainRecord?.domain || location.hostname,
                    t: performance.now(),
                })
        } catch (e) {
            // ignore
        }
        startApplyingCoupons(domainRecord).catch(err => {
            // A throw mid-flow must never leave the overlay trapping the page.
            console.error('Caramel: apply flow error', err)
            hideTestingModal()
        })
        document.body.removeChild(container)
    })

    document.body.appendChild(container)
}

async function showTestingModal(title = '', noLoading = false) {
    const overlay = document.createElement('div')
    overlay.id = 'caramel-testing-overlay'

    const modal = document.createElement('div')
    modal.id = 'caramel-testing-modal'

    const loadingHTML = `<p id="caramel-test-status">Looking for the best code…</p>
    <div id="caramel-progress-container">
      <div id="caramel-progress-bar"></div>
    </div>`

    modal.innerHTML = `
    <button id="caramel-testing-close" title="Stop" aria-label="Stop">${CARAMEL_ICONS.x}</button>
    <div class="caramel-modal-head">
      <span class="caramel-spinner"></span>
      <h2>${title || 'Applying coupons'}</h2>
    </div>
   ${noLoading ? '' : loadingHTML}`

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    // Let the user bail out — never trap them behind the overlay.
    const _close = modal.querySelector('#caramel-testing-close')
    if (_close)
        _close.addEventListener('click', () => {
            _caramelCancelled = true
            hideTestingModal()
        })
}

/**
 * Updates the "Testing Coupons" modal:
 *  - Changes the status text
 *  - Updates the progress bar width based on current vs total
 */
async function updateTestingModal(currentIndex, total, code) {
    // Update status text
    const statusEl = document.getElementById('caramel-test-status')
    if (statusEl) {
        statusEl.textContent = `Trying coupon ${currentIndex} of ${total} (${code})...`
    }

    // Update progress bar
    const progressBar = document.getElementById('caramel-progress-bar')
    if (progressBar && total > 0) {
        const progressPercent = Math.round((currentIndex / total) * 100)
        progressBar.style.width = `${progressPercent}%`
    }
}
function hideTestingModal() {
    const overlay = document.getElementById('caramel-testing-overlay')
    if (overlay) {
        document.body.removeChild(overlay)
    }
}

/* Robust, accurate copy of an exact coupon code. Tries the async clipboard
 * API first (works on the user-gesture from the Copy click); falls back to a
 * hidden textarea + execCommand for pages that block the async API. */
async function caramelCopyText(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch (e) {
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
    } catch (e) {
        return false
    }
}

async function showFinalModal(
    savingsAmount,
    code,
    message,
    isSignIn = false,
    couponList = [],
) {
    hideTestingModal()
    const overlay = document.createElement('div')
    overlay.id = 'caramel-final-overlay'

    const modal = document.createElement('div')
    modal.className = 'caramel-final-modal'

    // Three terminal states the user might be in:
    //   savedMoney   = we computed a real price drop ($X off)
    //   appliedCode  = we applied a code but couldn't measure savings
    //                  (site has no priceContainer in config — the cart
    //                  may show the discount inline; we just can't read
    //                  the number reliably). Still a win for the user.
    //   noLuck       = nothing applied (or signed-out / network error)
    const savedMoney = savingsAmount > 0
    const appliedCode = !savedMoney && !!code
    const isSuccess = savedMoney || appliedCode

    // Manual fallback: auto-apply found nothing but we still have codes. Many
    // codes are valid yet the store's checkout ignores the extension's
    // synthetic click (Shopify one-page checkout requires event.isTrusted),
    // so a hand-pasted code still works — offer the user a copy list.
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
        finalMessage = 'Caramel applied the best code it found at checkout.'
    } else if (appliedCode) {
        finalMessage = `Code ${esc(code)} is applied to your cart — review the discount before you check out.`
    } else if (hasManual) {
        finalMessage =
            "Auto-apply didn't catch this one. Copy a code and paste it at checkout."
    } else {
        finalMessage =
            message ||
            'Looks like you already have the best price. Go ahead and check out.'
    }

    const heading = savedMoney
        ? 'Savings found'
        : appliedCode
          ? 'Coupon applied'
          : isSignIn
            ? 'Sign in to continue'
            : hasManual
              ? 'Grab a code'
              : "You're all set"
    const tone = isSuccess ? 'success' : hasManual ? 'brand' : 'info'
    const iconSvg = savedMoney
        ? CARAMEL_ICONS.spark
        : appliedCode
          ? CARAMEL_ICONS.check
          : hasManual
            ? CARAMEL_ICONS.tag
            : CARAMEL_ICONS.info

    const manualBlock = hasManual
        ? `
        <div class="caramel-manual-list">
          ${manualCodes
              .map(
                  c => `
            <div class="caramel-manual-row">
              <div class="caramel-manual-info">
                <div class="caramel-manual-code">${esc(c.code)}</div>
                ${c.title ? `<div class="caramel-manual-title">${esc(c.title)}</div>` : ''}
              </div>
              <button class="caramel-manual-copy" data-code="${esc(c.code)}">${CARAMEL_ICONS.copy}Copy</button>
            </div>`,
              )
              .join('')}
        </div>`
        : ''

    modal.innerHTML = `
    <div class="caramel-final-icon caramel-final-icon--${tone}">${iconSvg}</div>
    <h2>${heading}</h2>
    <p class="caramel-final-msg">${finalMessage}</p>
    ${
        isSuccess
            ? `
            <div class="caramel-final-code">
              <span class="caramel-final-code-label">Code</span>
              <span class="caramel-final-code-val">${esc(code)}</span>
            </div>
            ${
                savedMoney
                    ? `<p class="caramel-final-savings">You saved $${savingsAmount.toFixed(2)}</p>`
                    : `<p class="caramel-final-hint">Discount applied in your cart</p>`
            }
          `
            : ''
    }
    ${manualBlock}
    <button id="caramel-final-ok-btn">
      ${isSignIn ? 'Sign in' : hasManual ? 'Done' : 'Continue to checkout'}
    </button>
  `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    // Wire manual-copy buttons — copies the EXACT code shown (data-code).
    modal.querySelectorAll('.caramel-manual-copy').forEach(btn => {
        btn.addEventListener('click', async ev => {
            ev.stopPropagation()
            const cc = btn.getAttribute('data-code')
            const ok = await caramelCopyText(cc)
            btn.textContent = ok ? 'Copied' : 'Press Ctrl+C'
            btn.style.background = ok ? '#15803d' : ''
            btn.style.borderColor = ok ? '#15803d' : ''
            btn.style.color = ok ? '#fff' : ''
            setTimeout(() => {
                btn.innerHTML = `${CARAMEL_ICONS.copy}Copy`
                btn.style.background = ''
                btn.style.borderColor = ''
                btn.style.color = ''
            }, 1600)
        })
    })

    // Close the modal on button click
    modal
        .querySelector('#caramel-final-ok-btn')
        .addEventListener('click', () => {
            document.body.removeChild(overlay)
            if (isSignIn) {
                //show popup.html
                currentBrowser.runtime.sendMessage({ action: 'openPopup' })
            }
        })
}
