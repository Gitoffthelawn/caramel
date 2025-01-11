const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome; // Chrome and Chromium-based browsers
    if (typeof browser !== "undefined") return browser; // Firefox
    throw new Error("Browser is not supported!");
})();

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('#current-website');
    const themeToggler = document.querySelector('#themeToggler');
    const themeContainer = document.querySelector('.theme-container');
    const loadingContainer = document.querySelector("#loading-container");
    if (container) {
        try {
            currentBrowser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                const url = new URL(tabs[0].url);
                const domain = url.hostname;

                const domainIsSupported = await getDomainRecord(domain);
                currentBrowser.storage.local.set({ domainSupported: domainIsSupported != null })
                container.innerHTML = domainIsSupported != null
                    ? `Yippy! <span class="classy">${domain}</span> is supported by <span class="classy">Caramel</span>`
                    : `Oops! <span class="classy">${domain}</span> is not supported by <span class="classy">Caramel</span>`;
            });
        } catch (error) {
            console.error('Error fetching domain:', error);
        }
    }

    currentBrowser.storage.local.get('theme', (result) => {
        const currentTheme = result.theme || 'light'; // Default to light mode
        themeContainer.classList.add(currentTheme === 'dark' ? 'dark-mode' : 'light-mode');
        themeContainer.classList.toggle('light-mode', currentTheme === 'light');
        themeContainer.classList.toggle('dark-mode', currentTheme === 'dark');
        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            setTimeout(() => {
                loadingContainer.style.display = 'none';
            }, 250);
        }, 250);
    });

    themeToggler.addEventListener('click', () => {
        const isLightMode = themeContainer.classList.contains('light-mode');
        themeContainer.classList.toggle('light-mode', !isLightMode);
        themeContainer.classList.toggle('dark-mode', isLightMode);

        const newTheme = isLightMode ? 'dark' : 'light';
        currentBrowser.storage.local.set({ theme: newTheme });
    });
});
