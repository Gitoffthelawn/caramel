log('Injected script')
// Run now if the page already finished loading (content scripts can inject
// after 'load' has fired, in which case the listener would never run).
if (document.readyState === 'complete') {
    startCheckoutDetection()
} else {
    window.addEventListener('load', () => startCheckoutDetection())
}
