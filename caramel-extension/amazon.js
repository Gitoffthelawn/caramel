function getAmazonCartKeywords() {
    // This selector may need to be adapted for the real checkout page
    const itemTitleEls = document.querySelectorAll(".sc-list-item .a-truncate-full, .sc-list-item .a-truncate-full.a-offscreen");

    let allWords = [];
    itemTitleEls.forEach((el) => {
        const title = el.innerText.trim().toLowerCase();
        const words = title.split(/\s+/).filter(Boolean);
        allWords = allWords.concat(words);
    });

    const uniqueWords = [...new Set(allWords)];
    // Join them into a comma-separated string
    return uniqueWords.join(",");
}

function applyCouponForAmazon(code) {
    return new Promise((resolve) => {
        // Example selectors - these may be incorrect for the real Amazon flow
        const promoInput = document.querySelector("#promoCode");
        const applyButton = document.querySelector('input[name="applyPromo"]');

        if (!promoInput || !applyButton) {
            // If the user’s in a checkout stage without a promo code field
            return resolve({ success: false, newTotal: NaN });
        }

        // Insert the code
        promoInput.value = code;
        // Trigger an input event
        promoInput.dispatchEvent(new Event("input", { bubbles: true }));

        // Click “Apply”
        applyButton.click();

        // Let Amazon process the code for a few seconds
        setTimeout(() => {
            // Check if the total changed
            const updatedTotal = getAmazonOrderTotal();
            resolve({ success: true, newTotal: updatedTotal });
        }, 3000); // adjust timing as needed
    });
}

function getAmazonOrderTotal() {
    const totalEl = document.querySelector("#sc-subtotal-amount-buybox .a-size-medium.a-color-base");
    if (!totalEl) {
        // Another fallback or return 0
        return "0.00";
    }
    const text = totalEl.innerText.replace(/[^0-9.]/g, "");
    return text || "0.00";
}
