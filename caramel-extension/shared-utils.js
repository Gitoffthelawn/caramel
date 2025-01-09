function initCouponFlow(site) {
    // Insert a small button/prompt for the user to click
    console.log("Caramel: Inserting prompt for coupons...");
    insertCaramelPrompt(site);
}

async function insertCaramelPrompt(site) {
    // Avoid inserting the prompt more than once
    if (document.getElementById("caramel-small-prompt")) {
        return;
    }

    const container = document.createElement("div");
    container.id = "caramel-small-prompt";

    container.style.position = "fixed";
    container.style.top = "60px";
    container.style.right = "20px";
    container.style.zIndex = "999999";
    container.style.background = "#ea6925";
    container.style.padding = "20px";
    container.style.borderRadius = "12px";
    container.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
    container.style.cursor = "pointer";
    container.style.color = "white";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.fontSize = "16px";
    container.style.textAlign = "center";
    container.style.animation = "fadeIn 0.5s ease-in-out, bounce 2s infinite";
    const logoUrl = await currentBrowser.runtime.getURL("assets/logo-light.png");
    container.innerHTML = `
    <div style="font-weight: bold;display: flex;justify-content: center">
        <img style="width: 30px;height: 30px;margin-top: auto;margin-bottom: auto" src="${logoUrl}" alt="logo"/>
        <div style="margin-top: auto;margin-bottom: auto;padding-top: 5px">Try Caramel Coupons? </div>
     </div><br>
      <button id="caramel-close-btn" style="
            background: none; 
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            padding: 1px;
            border-radius: 50%;
            background: white;
            color: #ea6925;
            border: none; 
            font-size: 18px; 
            cursor: pointer; 
            margin-left: 10px;
        ">×</button>
    <small style="font-size: 14px;">Save more with automatic coupons!</small>
`;

    const style = document.createElement("style");
    style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
    }
`;
    document.head.appendChild(style);

    container.addEventListener("click", (event) => {
        if (event.target.id === "caramel-close-btn") {
            // If the close button is clicked, just remove the popup
            document.body.removeChild(container);
            return;
        }
        // If the container itself is clicked, start applying coupons
        startApplyingCoupons(site);
        document.body.removeChild(container);
    });

    document.body.appendChild(container);
}

async function startApplyingCoupons(site) {
    // 1. Gather keywords from the cart
    let keywords = "";
    if(site === "amazon.com") {
        keywords = getAmazonCartKeywords();
    }

    // 2. Fetch coupons from your backend
    const coupons = await fetchCoupons(site,keywords);
    if (!coupons || coupons.length === 0) {
        showFinalModal(0, "No better price found. This is already the best you can get!");
        return;
    }

    // 3. Show a “Testing Coupons” modal to the user
    showTestingModal();

    let bestCode = null;
    let bestDifference = 0;

    // Store the original total to compare against
    let originalTotal = null;
    if(site === "amazon.com") {
        originalTotal = parseFloat(getAmazonOrderTotal());
    }
    console.log("Caramel: Original total is:", originalTotal);

    // 4. Apply each coupon in turn
    for (let i = 0; i < coupons.length; i++) {
        const code = coupons[i].code; // or however your backend returns codes
        updateTestingModal(i + 1, coupons.length, code);

        let  success = false;
        let newTotal = null;
        if(site === "amazon.com") {
            const result = await applyCouponForAmazon(code);
            success = result.success;
            newTotal = result.newTotal
        }
        if (!success) {
            console.log(`Caramel: Coupon ${code} not successfully applied (or no discount field)`);
            // set the coupon as expired
            continue;
        }

        const numericNewTotal = parseFloat(newTotal);
        const difference = originalTotal - numericNewTotal;
        console.log(`Caramel: Applied ${code}, new total = ${numericNewTotal}, difference = ${difference}`);

        if (difference > bestDifference) {
            bestDifference = difference;
            bestCode = code;
        }
    }

    // 5. Hide testing modal
    hideTestingModal();

    // 6. Show final results
    if (bestDifference > 0) {
        showFinalModal(bestDifference, `We found a coupon that saves you $${bestDifference.toFixed(2)}!`);
        console.log("Caramel: Best coupon code:", bestCode, "Saved:", bestDifference);
    } else {
        showFinalModal(0, "No better price found. This is already the best you can get!");
    }
}

async function fetchCoupons(site,keywords) {
    const url = `http://localhost:3000/coupons?&site=${site}&key_words=${encodeURIComponent(keywords)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Caramel: Error fetching coupons:", response.status, response.statusText);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Caramel: Fetch error:", error);
        return [];
    }
}


function showTestingModal() {
    // Create an overlay
    const overlay = document.createElement("div");
    overlay.id = "caramel-testing-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    overlay.style.zIndex = "1000000";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    // Create the modal
    const modal = document.createElement("div");
    modal.id = "caramel-testing-modal";
    modal.style.backgroundColor = "#fff";
    modal.style.padding = "20px";
    modal.style.borderRadius = "8px";
    modal.style.width = "300px";
    modal.style.boxShadow = "0 2px 10px rgba(0,0,0,0.4)";
    modal.style.fontFamily = "Arial, sans-serif";
    modal.innerHTML = `
    <h2 style="margin-top: 0;">Applying Coupons...</h2>
    <p id="caramel-test-status">Loading...</p>
  `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function updateTestingModal(currentIndex, total, code) {
    const statusEl = document.getElementById("caramel-test-status");
    if (statusEl) {
        statusEl.textContent = `Trying coupon ${currentIndex} of ${total} (${code})...`;
    }
}

function hideTestingModal() {
    const overlay = document.getElementById("caramel-testing-overlay");
    if (overlay) {
        document.body.removeChild(overlay);
    }
}


function showFinalModal(savingsAmount, message) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "caramel-final-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    overlay.style.zIndex = "1000000";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    // Create the modal
    const modal = document.createElement("div");
    modal.style.backgroundColor = "#fff";
    modal.style.padding = "30px";
    modal.style.borderRadius = "12px";
    modal.style.width = "320px";
    modal.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.4)";
    modal.style.fontFamily = "Arial, sans-serif";
    modal.style.textAlign = "center";

    // Success or no savings message styling
    const isSuccess = savingsAmount > 0;
    const headerText = isSuccess ? "🎉 Savings Found!" : "No Savings Found";
    const headerColor = "#ff9058"; // Green for success, red for no savings

    modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 10px 0 0 0; color: ${headerColor}; font-size: 22px;">${headerText}</h2>
    </div>
    <p style="font-size: 16px; color: #333;">${message}</p>
    ${
        isSuccess
            ? `<p style="font-size: 18px; color: #28a745; font-weight: bold;">You saved $${savingsAmount.toFixed(
                2
            )}!</p>`
            : ""
    }
    <button id="caramel-final-ok-btn" style="
        margin-top: 20px; 
        background: #ff9058; 
        border: none; 
        color: #fff; 
        padding: 10px 20px; 
        border-radius: 8px; 
        cursor: pointer; 
        font-size: 16px; 
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        transition: background 0.3s;
    ">
      Proceed to Checkout
    </button>
  `;

    // Add hover effect to the button
    const style = document.createElement("style");
    style.textContent = `
    #caramel-final-ok-btn:hover {
        background: #ffbf47;
    }
    `;
    document.head.appendChild(style);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector("#caramel-final-ok-btn").addEventListener("click", () => {
        document.body.removeChild(overlay);
    });
}
async function isSupported(domain) {
    let supportedDomains = [];
    try {
        const response = await fetch(currentBrowser.runtime.getURL('supported.json'));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        supportedDomains = Array.isArray(data.supported) ? data.supported : data;
    } catch (error) {
        console.error('Error loading supported.json:', error);
    }

    return supportedDomains.includes(domain);
}