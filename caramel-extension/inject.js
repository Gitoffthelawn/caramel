const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome;
    if (typeof browser !== "undefined") return browser;
    throw new Error("Browser is not supported!");
})();

(async function () {
    const domain = window.location.hostname;
    const domainIsSupported = await isSupported(domain);
    console.log(`Caramel: ${domain} is supported by Caramel: ${domainIsSupported}`);
    if (domainIsSupported) {
        const fullUrl = window.location.href;
        if (fullUrl) {
            console.log("Caramel: URL changed to", fullUrl);
            if (domain.includes("amazon.com")) {
                console.log("Caramel: Detected Amazon domain");
                if (fullUrl.includes("/checkout")) {
                    console.log("Caramel: Detected Amazon checkout page");
                    initCouponFlow("amazon.com");
                }
            } // Add cases for other domains like eBay, Walmart, etc.
        }
    }
})();