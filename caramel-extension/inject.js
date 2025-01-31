const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome;
    if (typeof browser !== "undefined") return browser;
    throw new Error("Browser is not supported!");
})();
console.log("Caramel: Injected script");
window.addEventListener("load", async () => {
    console.log("Caramel: DOM loaded");
    const domain = window.location.hostname;
    console.log("Caramel: Current domain", domain);
    const domainRecord = await getDomainRecord(domain);
    console.log("Caramel: Domain record", domainRecord)
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
