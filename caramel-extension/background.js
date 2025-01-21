const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome; // Chrome and Chromium-based browsers
    if (typeof browser !== "undefined") return browser; // Firefox
    throw new Error("Browser is not supported!");
})();


// Keep-Alive Mechanism
function keepAlive() {
    setInterval(() => {
        console.log("Service worker is alive");
    }, 10000); // Logs every 10 seconds to indicate service worker is active
}

keepAlive();

currentBrowser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "keepAlive") {
        console.log("Received keep-alive message from content script");
        sendResponse({ status: "alive" }); // Respond to the message
    }
    if (message.action === "scrapeAmazonCartKeywords") {
        const originalTab = sender.tab;
        currentBrowser.tabs.create({ url: "https://www.amazon.com/gp/cart/view.html?ref_=nav_cart" })
            .then(async (amazonCartPage) => {
                await currentBrowser.scripting.executeScript({
                    target: { tabId: amazonCartPage.id },
                    files: ["shared-utils.js"]
                });

                const result = await currentBrowser.scripting.executeScript({
                    target: { tabId: amazonCartPage.id },
                    func: async () => {
                        window.showTestingModal("Fetching coupon keywords...", true);
                        return new Promise(async (resolve, reject) => {
                            try {
                                const productTitleElements = document.querySelectorAll('.sc-product-title');
                                const titles = Array.from(productTitleElements).map((element) => element.textContent.trim());
                                const keywords = titles.join(" ").split(" ");
                                console.log("Keywords:", keywords);
                                const filteredKeywords = await window.filterKeywords(keywords);
                                console.log("Filtered Keywords:", filteredKeywords);
                                resolve(filteredKeywords);
                            } catch (error) {
                                reject(error);
                            }
                        });
                    }
                });
                console.log("Amazon cart keywords:", result[0].result); // result is wrapped in an array
                sendResponse({ keywords: result[0].result }); // Send filtered keywords as respons
                currentBrowser.tabs.remove(amazonCartPage.id);
                currentBrowser.tabs.update(originalTab.id, { active: true });
            })
            .catch((error) => {
                console.error("Error during Amazon cart scraping:", error);
                sendResponse({ error: "Failed to scrape Amazon cart" });
            });
        return true;
    }
});




