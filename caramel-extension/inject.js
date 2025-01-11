const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome;
    if (typeof browser !== "undefined") return browser;
    throw new Error("Browser is not supported!");
})();

(async function () {
    const domain = window.location.hostname;
    const domainRecord = await getDomainRecord(domain);

    console.log(`Caramel: ${domain} is supported by Caramel: ${domainRecord != null}`);
    if (domainRecord) {
        const fullUrl = window.location.href;
        if (fullUrl) {
            const input = await document.querySelector(`${domainRecord.couponInput}`);
            if (input) {
                console.log("Caramel: Detected Amazon checkout page");
                initCouponFlow(domainRecord);
            }
        }
    }
})();