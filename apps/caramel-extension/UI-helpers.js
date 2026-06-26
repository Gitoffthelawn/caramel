//UI HELPERS

/* -------------------------------------------------- UI prompt   */

async function insertCaramelPrompt(domainRecord) {
    if (document.getElementById('caramel-small-prompt')) return
    const container = document.createElement('div')
    container.id = 'caramel-small-prompt'
    const logoUrl = await currentBrowser.runtime.getURL('assets/logo-light.png')
    container.innerHTML = `
    <button id="caramel-close-btn" aria-label="Dismiss">×</button>
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

    container.addEventListener('click', event => {
        if (event.target.id === 'caramel-close-btn') {
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

    const logoUrl = currentBrowser.runtime.getURL('assets/logo-light.png')

    const loadingHTML = `<p id="caramel-test-status">Loading...</p>
    <div id="caramel-progress-container">
      <div id="caramel-progress-bar"></div>
    </div>`

    modal.innerHTML = `
    <button id="caramel-testing-close" title="Stop">×</button>
    <div class="caramel-modal-header">
      <img class="caramel-modal-logo" src="${logoUrl}" alt="Caramel Logo" />
      <h2>${title || 'Applying Coupons...'}</h2>
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
        finalMessage = `We found a coupon that saves you $${savingsAmount.toFixed(2)}!`
    } else if (appliedCode) {
        finalMessage = `Code ${esc(code)} is applied to your cart — review the discount before you check out.`
    } else if (hasManual) {
        finalMessage =
            "Auto-apply didn't stick this time. Copy a code and paste it in the store's promo box."
    } else {
        finalMessage =
            message || "Looks like you're already getting the best deal."
    }

    // Caramel brand/logo
    const brandColor = '#ea6925'
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
              <button class="caramel-manual-copy" data-code="${esc(c.code)}">Copy</button>
            </div>`,
              )
              .join('')}
        </div>`
        : ''

    modal.innerHTML = `
    <div class="caramel-final-logo">
      <img src="${logoUrl}" alt="Caramel Logo" />
    </div>
    <h2>${heading}</h2>
    <p class="caramel-final-msg">${finalMessage}</p>
    ${manualBlock}
    ${
        isSuccess
            ? `
            <p class="caramel-final-code">
              Code: <span>${esc(code)}</span>
            </p>
            ${
                savedMoney
                    ? `<p class="caramel-final-savings">You saved $${savingsAmount.toFixed(2)}!</p>`
                    : `<p class="caramel-final-hint">Discount visible in your cart.</p>`
            }
          `
            : ''
    }
    <button id="caramel-final-ok-btn">
      ${isSignIn ? 'Sign In' : hasManual ? 'Done' : 'Proceed to Checkout'}
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
            const prev = btn.textContent
            btn.textContent = ok ? 'Copied!' : 'Press Ctrl+C'
            btn.style.background = ok ? '#1f9d55' : brandColor
            setTimeout(() => {
                btn.textContent = prev
                btn.style.background = brandColor
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
