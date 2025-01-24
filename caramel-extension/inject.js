const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome;
    if (typeof browser !== "undefined") return browser;
    throw new Error("Browser is not supported!");
})();

window.addEventListener("load", async () => {
    const domain = window.location.hostname;
    const domainRecord = await getDomainRecord(domain);
    if (domainRecord) {
        const fullUrl = window.location.href;
        if (fullUrl) {
            const input = await document.querySelector(`${domainRecord.couponInput}`);
            const showInputButton = await document.querySelector(`${domainRecord.showInput}`);
            if (input || showInputButton) {
                console.log("Caramel: Detected checkout page");
                initCouponFlow(domainRecord);
            }
        }
    }
});
