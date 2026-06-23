//UI HELPERS

/* -------------------------------------------------- UI prompt   */

async function insertCaramelPrompt(domainRecord) {
    // Avoid inserting the prompt more than once
    if (document.getElementById('caramel-small-prompt')) {
        return
    }
    const container = document.createElement('div')
    container.id = 'caramel-small-prompt'

    container.style.position = 'fixed'
    container.style.top = '60px'
    container.style.right = '20px'
    container.style.zIndex = '999999'
    container.style.background = '#ea6925'
    container.style.padding = '20px'
    container.style.borderRadius = '12px'
    container.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)'
    container.style.cursor = 'pointer'
    container.style.color = 'white'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.fontSize = '16px'
    container.style.textAlign = 'center'
    container.style.animation = 'fadeIn 0.5s ease-in-out, bounce 2s infinite'
    const logoUrl = await currentBrowser.runtime.getURL('assets/logo-light.png')
    container.innerHTML = `
    <div style="font-weight: bold;display: flex;justify-content: center">
        <img style="width: 30px;height: 30px;margin-top: auto;margin-bottom: auto" src="${logoUrl}" alt="logo"/>
        <div style="margin-top: auto;margin-bottom: auto;padding-top: 5px">Try Caramel Coupons? </div>
     </div><br>
      <button id="caramel-close-btn" style="
            background: none; 
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            padding: 1px;
            border-radius: 50%;
            background: white;
            color: #ea6925;
            border: none; 
            font-size: 18px; 
            cursor: pointer; 
            margin-left: 10px;
        ">×</button>
    <small style="font-size: 14px;">Save more with automatic coupons!</small>
`

    const style = document.createElement('style')
    style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
    }
`
    document.head.appendChild(style)

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
    // Create overlay
    const overlay = document.createElement('div')
    overlay.id = 'caramel-testing-overlay'
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
    overlay.style.zIndex = '1000000'
    overlay.style.display = 'flex'
    overlay.style.justifyContent = 'center'
    overlay.style.alignItems = 'center'

    // Create the modal container
    const modal = document.createElement('div')
    modal.id = 'caramel-testing-modal'

    // Main modal styling
    modal.style.position = 'relative'
    modal.style.backgroundColor = '#ea6925' // Brand color
    modal.style.padding = '20px'
    modal.style.borderRadius = '12px'
    modal.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)'
    modal.style.color = 'white'
    modal.style.width = '320px'
    modal.style.fontFamily = 'Arial, sans-serif'
    modal.style.textAlign = 'center'
    modal.style.animation = 'fadeIn 0.5s ease-in-out, bounce 2s infinite'

    // Fetch the Caramel logo
    const logoUrl = currentBrowser.runtime.getURL('assets/logo-light.png')

    const loadingHTML = ` <p id="caramel-test-status" style="margin: 10px 0; font-size: 15px;">Loading...</p>
    
    <!-- Progress bar container -->
    <div id="caramel-progress-container" style="
      background: rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      width: 100%;
      height: 10px;
      margin: 10px 0;
      position: relative;
      overflow: hidden;
    ">
      <!-- The actual progress bar -->
      <div id="caramel-progress-bar" style="
        background: #ffbf47; /* A slightly lighter brand tone or accent color */
        width: 0%;
        height: 100%;
        border-radius: 6px;
        transition: width 0.3s ease;
      "></div>
    </div>`
    modal.innerHTML = `
    <button id="caramel-testing-close" title="Stop" style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border:none;border-radius:50%;background:#fff;color:#ea6925;font-size:16px;line-height:1;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3)">×</button>
    <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 10px;">
      <img src="${logoUrl}" alt="Caramel Logo" style="width: 40px; height: 40px; margin-right: 8px;" />
      <h2 style="margin: 0; font-size: 18px;text-align: center">
        ${title ? title : 'Applying Coupons...'}
        </h2>
    </div>
   ${noLoading ? '' : loadingHTML}`

    // Add keyframe animations
    const style = document.createElement('style')
    style.textContent = `
  @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
  }
  `
    document.head.appendChild(style)

    // Append modal to overlay, and overlay to body
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
    // Create overlay
    const overlay = document.createElement('div')
    overlay.id = 'caramel-final-overlay'
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    overlay.style.zIndex = '1000000'
    overlay.style.display = 'flex'
    overlay.style.justifyContent = 'center'
    overlay.style.alignItems = 'center'

    // Create the modal
    const modal = document.createElement('div')
    modal.style.backgroundColor = '#fff'
    modal.style.padding = '30px'
    modal.style.borderRadius = '12px'
    modal.style.width = '400px' // Increased width
    modal.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.4)'
    modal.style.fontFamily = 'Arial, sans-serif'
    modal.style.textAlign = 'center'
    modal.style.position = 'relative'

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
            "Auto-apply didn't stick this time — no biggie! Copy a code and drop it in the store's promo box 👇"
    } else {
        finalMessage =
            message ||
            "Looks like you're already getting the best deal. Go ahead and buy!"
    }

    // Caramel brand/logo
    const brandColor = '#ea6925'
    const logoUrl = currentBrowser.runtime.getURL('assets/logo.png') // Adjust if needed

    const heading = savedMoney
        ? '🎉 Savings Found! 🎉'
        : appliedCode
          ? '✓ Coupon Applied'
          : isSignIn
            ? 'Oups..'
            : hasManual
              ? 'Grab a code 🎟️'
              : 'Heads up 🙂'

    const manualBlock = hasManual
        ? `
        <div style="max-height: 190px; overflow-y: auto; margin: 10px 0 2px; text-align: left;">
          ${manualCodes
              .map(
                  c => `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid #eee; border-radius: 8px; padding: 8px 10px; margin: 6px 0;">
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: bold; color: #333; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(c.code)}</div>
                ${c.title ? `<div style="font-size: 11px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(c.title)}</div>` : ''}
              </div>
              <button class="caramel-manual-copy" data-code="${esc(c.code)}" style="flex: none; background: ${brandColor}; border: none; color: #fff; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">Copy</button>
            </div>`,
              )
              .join('')}
        </div>`
        : ''

    // Modal inner HTML
    modal.innerHTML = `
    <!-- Logo Section -->
    <div style="display: flex; justify-content: center; margin-bottom: 10px;">
      <img 
        src="${logoUrl}" 
        alt="Caramel Logo" 
        style="width: 60px; height: 60px;" 
      />
    </div>

    <!-- Heading/Text Section -->
    <h2 style="
      margin: 0 0 15px 0; 
      color: ${brandColor}; 
      font-size: 24px; 
      font-weight: bold;
    ">
      ${heading}
    </h2>
    <p style="font-size: 13px; color: #333; margin: 0 0 10px 0;">
      ${finalMessage}
    </p>
    ${manualBlock}

    ${
        isSuccess
            ? `
            <p style="font-size: 22px; margin: 6px 0;">
              Code: <span style="color: ${brandColor}; text-decoration: underline; font-weight: bold;">${esc(code)}</span>
            </p>
            ${
                savedMoney
                    ? `<p style="font-size: 18px; color: ${brandColor}; font-weight: bold; margin: 4px 0 0;">
                        You saved $${savingsAmount.toFixed(2)}!
                      </p>`
                    : `<p style="font-size: 13px; color: #777; margin: 4px 0 0;">
                        Discount visible in your cart.
                      </p>`
            }
          `
            : ''
    }
    
    <button 
      id="caramel-final-ok-btn" 
      style="
        margin-top: 20px; 
        background: ${brandColor}; 
        border: none; 
        color: #fff; 
        padding: 12px 24px; 
        border-radius: 8px; 
        cursor: pointer; 
        font-size: 16px; 
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        transition: background 0.3s;
      "
    >
      ${isSignIn ? 'Sign In' : hasManual ? 'Done' : 'Proceed to Checkout'}
    </button>
  `

    // Add hover effect to the button
    const style = document.createElement('style')
    style.textContent = `
    #caramel-final-ok-btn:hover {
      background: #ffbf47;
    }
  `
    document.head.appendChild(style)

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
