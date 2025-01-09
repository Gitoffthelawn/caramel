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
});

currentBrowser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log("message")
    console.log(message)
    console.log("message")
    if (message.action === "start_process") {
        const originalTabId = sender.tab.id;
        await currentBrowser.scripting.executeScript({
            target: { tabId: originalTabId },
            files: ["shared-utils.js"]
        });
        await currentBrowser.scripting.executeScript({
            target: { tabId: originalTabId },
            func: async () => {
                window.clickButton('.clickable-element.bubble-element.Button.cmaTiy0');
            }
        });
        // const shopifyLoginUrl = "https://admin.shopify.com";
        const shopifyLoginUrl = "https://www.shopify.com/commerce-coach/adrianmorrison?irgwc=1&partner=3219387&affpt=excluded&utm_channel=affiliates&utm_source=3219387-impact&utm_medium=cpa&iradid=1061744";
        let shopifyLoginTab = await currentBrowser.tabs.create({ url: shopifyLoginUrl });
        let lastKnownURL = null;
        await handleNavigateFunnel(originalTabId);
        await handleAddOverlay(originalTabId);
        const urlPoller = setInterval(async () => {
            try {
                const tab = await currentBrowser.tabs.get(shopifyLoginTab.id);


                if(tab && tab.id === shopifyLoginTab.id && tab.url !== lastKnownURL) {
                    lastKnownURL = tab.url;
                    console.log('lastKnownURL: ', lastKnownURL)
                    if (lastKnownURL.includes("/checkout/select-plan")) {
                        console.log('lastKnownURL.includes(/checkout/select-plan: ', lastKnownURL)
                        console.log("User clicked OK on the alert. Resuming the script...");
                        await handleShopifySignup(shopifyLoginTab.id);
                    } else if (lastKnownURL.includes("admin.shopify.com/store")) {
                        clearInterval(urlPoller);
                        await handleCopyUrlToFunnel(shopifyLoginTab.id, originalTabId, lastKnownURL);
                    }
                }
            }  catch (error) {
                console.error("Error in URL polling:", error);
                clearInterval(urlPoller);
            }
        }, 500)
    }
});

async function handleShopifySignup(shopifyLoginTabId) {
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyLoginTabId},
        files: ["shared-utils.js"]
    });
    console.log("Handling Shopify signup1...");
    currentBrowser.scripting.executeScript({
        target: { tabId: shopifyLoginTabId },
        func: async () => {
            console.log("Handling Shopify signup2...");

            await window.waitForElement(".Polaris-Box");
            console.log("Handling Shopify signup3...");

            const saveButton = window.findElementByText("Skip, I'll decide later", "button");
            console.log('save button: ', saveButton)
            if(saveButton) {
                saveButton.focus();
                await saveButton.click();
            }
        }
    });

}

async function handleCopyUrlToFunnel(shopifyLoginTabId, originalTabId, tabUrl) {
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyLoginTabId },
        files: ["shared-utils.js"]
    });
    currentBrowser.scripting.executeScript({
        target: { tabId: shopifyLoginTabId },
        func: async () => {
            window.addLadingOverlay();
        }
    });
    const storeId = tabUrl.split("/store/")[1].split("?")[0];
    currentBrowser.tabs.remove(shopifyLoginTabId);
    // Step 3: Go back to the original tab and inject the store URL
    currentBrowser.tabs.update(originalTabId, { active: true }, async (updatedTab) => {
        if (currentBrowser.runtime.lastError) {
            console.error("Error returning to the original tab:", currentBrowser.runtime.lastError.message);
            return;
        }
        await currentBrowser.scripting.executeScript({
            target: { tabId: originalTabId },
            files: ["shared-utils.js"]
        });
        await currentBrowser.scripting.executeScript({
            target: { tabId: originalTabId },
            func: async (storeId) => {
                const storeUrl = `${storeId}.myshopify.com`;
                const shopifyInput = document.querySelector('input[placeholder="Your Shopify URL"]');
                shopifyInput.focus();
                shopifyInput.value = storeUrl;
                const event = new Event('input', { bubbles: true, cancelable: true });
                shopifyInput.dispatchEvent(event);

                const saveButton = window.findElementByText("Save", "button");
                if (!saveButton) throw new Error('Save button not found');
                await saveButton.click();
                const doneButton = window.findElementByText("✅ Done", "button");
                if (!doneButton) throw new Error('Done button not found');
                await doneButton.click();
            },
            args: [storeId],
        });
        const shopifyAdminUrl = `https://admin.shopify.com/store/${storeId}/settings/apps/development`;
        const shopifyAdminTab = await currentBrowser.tabs.create({ url: shopifyAdminUrl });
        handleSecondStep(shopifyAdminTab.id, originalTabId);
    });
}
async function handleAddOverlay(originalTabId) {
    await currentBrowser.scripting.executeScript({
        target: { tabId: originalTabId },
        files: ["shared-utils.js"]
    });
    currentBrowser.scripting.executeScript({
        target: { tabId: originalTabId },
        func: async () => {
            window.addLadingOverlay();
        }
    });
}

function handleSecondStep(shopifyAdminTabId, originalTabId) {
    let lastKnownURL = null;
    const funnelUrlPoller = setInterval(async () => {
        try {
            const tab = await currentBrowser.tabs.get(originalTabId)
            if (tab && tab.id === originalTabId && tab.url.endsWith("configure-the-app-in-shopify")) {
                clearInterval(funnelUrlPoller);
                await handleNavigateFunnel(originalTabId)
            }
        } catch (error) {
            console.error("Error in second step URL polling:", error);
            clearInterval(funnelUrlPoller);
        }
    }, 500);
    const urlPoller = setInterval(async () => {
        try {
            const tab = await currentBrowser.tabs.get(shopifyAdminTabId)
            if (tab && tab.id === shopifyAdminTabId && tab.url !== lastKnownURL) {
                lastKnownURL = tab.url;
                console.log("Admin tab URL changed:", lastKnownURL);

                if (lastKnownURL.endsWith("settings/apps/development")) {
                    await handleDevelopmentPage(shopifyAdminTabId);
                } else if (lastKnownURL.includes("/enable")) {
                    await handleEnablePage(shopifyAdminTabId);
                } else if (lastKnownURL.includes("/overview")) {
                    await handleOverviewPage(shopifyAdminTabId);
                } else if (lastKnownURL.includes("/api_credentials")) {
                    clearInterval(urlPoller);
                    await handleApiCredentialsPage(shopifyAdminTabId, originalTabId);
                }
            }
        } catch (error) {
            console.error("Error in second step URL polling:", error);
            clearInterval(urlPoller);
        }
    }, 500);
}

async function handleDevelopmentPage(shopifyAdminTabId) {
    console.log("Handling development page...");
    console.log("Shopify admin page detected, waiting for it to load...");
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        files: ["shared-utils.js"]
    });
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        func: async () => {
            try {
                await window.waitForElement("#SettingsDialog");
                window.addLadingOverlay();
                console.log("Body is loaded, running logic...");
                const enableButton = document.querySelector('a[href*="/enable"]');
                if (enableButton) {
                    console.log("Enable button found, clicking...");
                    await enableButton.click();
                    await window.clickButton(".Polaris-Button--variantPrimary");
                } else {
                    console.log("Enable button not found, looking for 'Create an app'...");
                    const createApp = window.findElementByText("Create an app", "button");
                    if (createApp) {
                        console.log("'Create an app' button found, clicking...");
                        await createApp.click();
                        await window.waitForElement('input[name="appName"]');
                        const appNameInput = document.querySelector('input[name="appName"]');
                        appNameInput.focus();
                        appNameInput.value = "Free E-Com Store Build";
                        const inputEvent = new Event('input', { bubbles: true });
                        appNameInput.dispatchEvent(inputEvent);

                        const start = Date.now();
                        const timeout = 15000;
                        const interval = setInterval(() => {
                            const confirmButton = window.findElementByText("Create app", "button");
                            if (!confirmButton) {
                                clearInterval(interval);
                                console.log("Confirm button not found.");
                                return;
                            }
                            if (
                                !confirmButton.classList.contains("Polaris-Button--disabled")
                            ) {
                                clearInterval(interval);
                                console.log("Confirm button is now enabled. Proceeding...");
                                confirmButton.focus();
                                confirmButton.click();
                                return;
                            }
                            if (Date.now() - start > timeout) {
                                clearInterval(interval);
                                reject(new Error("Save button did not disable or stop loading within the timeout period."));
                            }
                        }, 100);
                    }
                }
            } catch (error) {
                console.error("Error during execution:", error.message);
            }
        }
    })
}

async function handleEnablePage(shopifyAdminTabId) {
    console.log("Handling enable page...");
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        files: ["shared-utils.js"]
    });
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        func: async () => {
            try {
                await window.waitForElement(".Polaris-Page");
                window.addLadingOverlay();
                const enableButton = window.findElementByText("Allow custom app development", "button");
                if (enableButton) {
                    console.log("Enable button found, clicking...");
                    await enableButton.click();
                }
            } catch (error) {
                console.error("Error during execution:", error.message);
            }
        }
    })
}

async function handleOverviewPage(shopifyAdminTabId) {
    console.log("Handling overview page...");
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        files: ["shared-utils.js"]
    });
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        func: async () => {
            const proceed = async () => {
                const saveButton = window.findElementByText("Save", "button");

                if (!saveButton) {
                    console.error("Save button not found.");
                    return;
                }

                await new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        saveButton.focus();
                        console.log("Clicking Save button...");
                        saveButton.click();
                        const start = Date.now();
                        const timeout = 15000;
                        const interval = setInterval(() => {
                            const saveButton = window.findElementByText("Save", "button");
                            if (!saveButton) {
                                clearInterval(interval);
                                reject(new Error("Save button not found after clicking."));
                                return;
                            }
                            if (
                                !saveButton.classList.contains("Polaris-Button--loading") &&
                                saveButton.classList.contains("Polaris-Button--disabled")
                            ) {
                                clearInterval(interval);
                                console.log("Save button is now disabled. Proceeding...");
                                resolve();
                                return;
                            }
                            if (Date.now() - start > timeout) {
                                clearInterval(interval);
                                reject(new Error("Save button did not disable or stop loading within the timeout period."));
                            }
                        }, 100);
                    }, 200);
                });

                // Find the "Configuration" tab by its title
                const configurationTab = Array.from(document.querySelectorAll('.Polaris-LegacyTabs__Tab')).find(tab =>
                    tab.textContent.trim() === "Configuration"
                );

                if (configurationTab) {
                    console.log("Configuration tab found:", configurationTab);

                    // Find the nearest container or parent
                    const parentContainer = configurationTab.closest('.Polaris-LegacyTabs');

                    if (parentContainer) {
                        console.log("Parent container of Configuration tab found:", parentContainer);

                        // Look for the "More views" button within this container
                        const moreViewsButton = parentContainer.querySelector('.Polaris-LegacyTabs__DisclosureActivator');

                        if (moreViewsButton) {
                            console.log("More views button found near Configuration tab:", moreViewsButton);
                            moreViewsButton.focus();
                            moreViewsButton.click();
                            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for animation
                        } else {
                            console.error("More views button not found near Configuration tab.");
                        }
                    } else {
                        console.error("Parent container for Configuration tab not found.");
                    }
                } else {
                    console.error("Configuration tab not found.");
                }

                // Proceed to locate the API credentials button
                const credentialsButton = await window.waitForElement("#api-credentials");
                if (credentialsButton) {
                    console.log("#api-credentials button found. Clicking it now.");
                    credentialsButton.focus();
                    credentialsButton.click();
                } else {
                    console.error("#api-credentials button not found.");
                }

                if(credentialsButton) {
                    credentialsButton.focus();
                    await credentialsButton.click();
                }
            };
            const checkNextCheckbox = () => {
                const checkbox = document.querySelector('input[type="checkbox"]:not(:checked)');
                if (checkbox) {
                    checkbox.checked = true;
                    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
                    checkbox.dispatchEvent(clickEvent);
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                    checkbox.dispatchEvent(inputEvent);
                    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    checkbox.dispatchEvent(changeEvent);
                    setTimeout(checkNextCheckbox, 200);
                } else {
                    console.log("All checkboxes are checked.");
                    proceed();
                }
            };
            try {
                await window.waitForElement("#SettingsDialog");
                window.addLadingOverlay();
                const settingsButton = await window.waitForElement('a[href$="/admin_api_integration"]');
                if (settingsButton) {
                    console.log("Button found:", settingsButton.href);
                    await settingsButton.click();
                    await window.waitForElement('input[type="checkbox"]');
                    checkNextCheckbox();
                }
            } catch (error) {
                console.error("Error during execution:", error.message);
            }
        }
    })
}

async function handleApiCredentialsPage(shopifyAdminTabId, originalTabId) {
    console.log("Handling API credentials page...");
    let token = null;
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        files: ["shared-utils.js"]
    });
    await currentBrowser.scripting.executeScript({
        target: { tabId: shopifyAdminTabId },
        func: async () => {
            return new Promise(async (resolve, reject) => {
                const getToken = async () => {
                    await window.waitForElement(".Polaris-Text--root.Polaris-Text--bodyMd.Polaris-Text--regular")
                    const input = window.getInputElement("••••••")
                    if(input) {
                        const revealButton = window.findElementByText("Reveal token once", "button");
                        if(revealButton) {
                            revealButton.focus();
                            await revealButton.click();
                            const revealedValue = await window.monitorInputValue(input);
                            resolve(revealedValue);
                        }
                    }
                }
                const copyApiCredentials = async () => {
                    const installButton = window.findElementByText("Install app", "button");
                    if(installButton) {
                        installButton.focus();
                        await installButton.click();
                        console.log("clicking install button");
                        await window.waitForElement(".Polaris-Box")
                        const confirmInstallButton = window.findElementByText("Install", "button");
                        if(confirmInstallButton) {
                            confirmInstallButton.focus();
                            await confirmInstallButton.click();
                        }
                        await getToken();
                    } else {
                        console.log("Install button not found")
                        await getToken();
                    }
                }
                try {
                    await window.waitForElement("#SettingsDialog");
                    await copyApiCredentials();
                } catch (error) {
                    console.error("Error during execution:", error.message);
                }
            });
        }
    }).then((value) => {
        token = value;
    })
    await currentBrowser.tabs.remove(shopifyAdminTabId);
    HandleThirdStep(originalTabId, token[0].result);
}


function HandleThirdStep(originalTabId, token) {
    currentBrowser.tabs.update(originalTabId, { active: true }, async (updatedTab) => {
        if (currentBrowser.runtime.lastError) {
            console.error("Error returning to the original tab:", currentBrowser.runtime.lastError.message);
            return;
        }
        try {
            await currentBrowser.scripting.executeScript({
                target: { tabId: originalTabId },
                files: ["shared-utils.js"]
            });
            const result = await currentBrowser.scripting.executeScript({
                target: { tabId: originalTabId },
                func: async (token) => {
                    try {
                        console.log("RUNNING FINAL SCRIPT")
                        const shopifyTokenInput = document.querySelector('input[placeholder="Your Shopify Token"]');
                        if (!shopifyTokenInput) throw new Error("Shopify Token input not found");
                        console.log("Populating Shopify Token...");
                        shopifyTokenInput.focus();
                        shopifyTokenInput.value = token;
                        const event = new Event('input', { bubbles: true, cancelable: true });
                        shopifyTokenInput.dispatchEvent(event);
                        const saveButton = window.findElementByText("Save", "button");
                        if (!saveButton) throw new Error("Save button not found");

                        saveButton.focus();
                        saveButton.click();

                        console.log("Save button clicked");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const doneButton = window.findElementByText("✅ Done", "button");
                        if (!doneButton) throw new Error("Done button not found");

                        doneButton.focus();
                        doneButton.click();

                        console.log("Done button clicked");
                        return { success: true };
                    } catch (error) {
                        console.error("Error inside func:", error.message);
                        return { success: false, error: error.message };
                    }
                },
                args: [token],
            });

            console.log("Script executed successfully:", result);
        } catch (error) {
            console.error("Error executing script:", error.message);
        }
    });
}


async function handleNavigateFunnel(originalTabId) {
    await currentBrowser.scripting.executeScript({
        target: { tabId: originalTabId },
        files: ["shared-utils.js"]
    });
    currentBrowser.scripting.executeScript({
        target: { tabId: originalTabId },
        func: async () => {
            const doneButton = window.findElementByText("✅ Done", "button");
            if (doneButton){
                await doneButton.click();
            } else {
                console.log("Done button not found.");
                const hiddenDiv = await window.waitForElement(".bubble-element.Group.cmaVaFa0.bubble-r-container.flex.column");
                console.log("Hidden div found:", hiddenDiv);
                if(hiddenDiv) {
                    const firstChild = hiddenDiv.children[0];
                    console.log("First child:", firstChild);
                    if(firstChild) {
                        firstChild.style.visibility = "visible";
                        const doneButton = window.findElementByText("✅ Done", "button");
                        console.log("Done button:", doneButton);
                        if (doneButton){
                            await doneButton.click();
                        }
                    }
                }
            }
        }
    });
}


