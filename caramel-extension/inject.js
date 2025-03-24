const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome;
    if (typeof browser !== "undefined") return browser;
    throw new Error("Browser is not supported!");
})();
console.log("Caramel: Injected script");
window.addEventListener("load", async () => {
    await tryInitialize();
});
