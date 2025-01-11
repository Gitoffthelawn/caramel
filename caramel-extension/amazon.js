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

function getAmazonOrderTotal() {
    const totalEl = document.querySelector("#sc-subtotal-amount-buybox .a-size-medium.a-color-base");
    if (!totalEl) {
        // Another fallback or return 0
        return "0.00";
    }
    const text = totalEl.innerText.replace(/[^0-9.]/g, "");
    return text || "0.00";
}
