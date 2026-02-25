;(() => {
    window.getAmazonOrderTotal = async () => {
        const totalEl = document.querySelector(
            '#sc-subtotal-amount-buybox .a-size-medium.a-color-base',
        )
        if (!totalEl) {
            // Another fallback or return 0
            return '0.00'
        }
        const text = totalEl.innerText.replace(/[^0-9.]/g, '')
        return text || '0.00'
    }
})()

// Message handler for background to request cart keywords
currentBrowser.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req.action !== 'caramel:scrapeAmazonCartKeywordsFromCart') return

    try {
        const titles = Array.from(document.querySelectorAll('.sc-product-title'))
            .map(el => (el.textContent || '').trim())
            .filter(Boolean)

        const words = titles
            .join(' ')
            .split(/\s+/)
            .map(w => w.replace(/[^\w'-]/g, '').toLowerCase())
            .filter(w => w.length >= 3)

        const keywords = Array.from(new Set(words))
        sendResponse({ keywords })
    } catch (e) {
        sendResponse({ keywords: [] })
    }
    // sync response; no need to return true
})
