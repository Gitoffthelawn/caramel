// popup.js

document.addEventListener("DOMContentLoaded", async () => {
    // Remove the loading overlay after a short delay
    const loadingContainer = document.getElementById("loading-container");
    if (loadingContainer) {
        setTimeout(() => {
            loadingContainer.style.display = "none";
        }, 400);
    }

    // 1) Main init
    await initPopup();
});

// ========================================================
//  Main logic entry — checks the current domain via background
// ========================================================
async function initPopup() {
    const domainRecord = await getActiveTabDomainRecord();

    // Grab the user’s auth info from storage
    currentBrowser.storage.sync.get(["token", "user"], (result) => {
        const token = result.token;
        const user = result.user;
        if(domainRecord) {
            renderCheckoutCoupons(domainRecord, user);
        } else {
            if (token) {
                renderProfileCard(user);
            } else {
                renderSignInPrompt();
            }
        }
    });
}

// ========================================================
//  Ask background for the domain record of the active tab
// ========================================================
function getActiveTabDomainRecord() {
    return new Promise((resolve) => {
        currentBrowser.runtime.sendMessage(
            { action: "getActiveTabDomainRecord" },
            (response) => {
                resolve(response?.domainRecord || null);
            }
        );
    });
}

// ========================================================
//  Old logic unchanged below...
// ========================================================
function renderSignInPrompt() {
    const authContainer = document.getElementById("auth-container");
    authContainer.innerHTML = `
      <div class="login-prompt fade-in-up">
        <p>In order to start using our coupons, please sign in!</p>
        <form id="loginForm" class="login-form">
          <div id="loginErrorMessage" class="error-message" style="display: none;"></div>
          <div>
            <label>Email</label>
            <input type="email" id="email" required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" id="password" required />
          </div>
          <button type="submit" class="login-button">Login</button>
        </form>
        <p class="mt-6">Don't have an account?
          <a href="https://grabcaramel.com/signup" target="_blank" rel="noopener noreferrer">Sign Up</a>
        </p>
      </div>
    `;

    // Hide the settings icon when not logged in
    const settingsIcon = document.getElementById("settingsIcon");
    if (settingsIcon) {
        settingsIcon.style.display = "none";
    }

    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorMessageElem = document.getElementById("loginErrorMessage");
        errorMessageElem.style.display = "none";
        errorMessageElem.textContent = "";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            // Call your Next.js endpoint at /extension/login
            const response = await fetch("https://grabcaramel.com/api/extension/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Login failed");
            }

            const { token, username, image } = await response.json();
            const user = { username, image };

            // Store token/user
            currentBrowser.storage.sync.set({ token, user }, () => {
                // Re-init the popup so it can show the "profile card" or "checkout UI"
                initPopup();
            });
        } catch (err) {
            console.error("Login error:", err);
            errorMessageElem.textContent = `Login failed: ${err.message}`;
            errorMessageElem.style.display = "block";
        }
    });
}

function renderProfileCard(user) {
    const authContainer = document.getElementById("auth-container");
    const imageUrl = user.image && user.image.length
        ? user.image
        : "assets/default-profile.png";

    authContainer.innerHTML = `
    <div class="profile-card fade-in-up">
      <img src="${imageUrl}" alt="Profile" class="profile-image" />
      <div class="welcome-message">Welcome back, ${user.username}!</div>
      <div class="username">@${user.username}</div>
      <div class="profile-actions">
        <button id="logoutButton" class="logout-button">Logout</button>
      </div>
    </div>
  `;

    // Show the settings icon in the header
    const settingsIcon = document.getElementById("settingsIcon");
    if (settingsIcon) {
        settingsIcon.style.display = "block";
        settingsIcon.onclick = () => {
            window.open("https://grabcaramel.com/profile", "_blank");
        };
    }

    document.getElementById("logoutButton").addEventListener("click", () => {
        currentBrowser.storage.sync.remove(["token", "user"], () => {
            // Re-init so it shows the sign-in prompt again
            initPopup();
        });
    });
}

// ========================================================
//  NEW 1: Render login prompt specifically for "checkout" flows
//         (Same as normal login, but includes a "Back" button.)
// ========================================================

// ========================================================
//  NEW 2: Show the actual coupon list for the recognized domain
// ========================================================
async function renderCheckoutCoupons(domainRecord, user) {
    const authContainer = document.getElementById("auth-container");

    // 1) Fetch coupons for this domain
    const coupons = await getCoupons(domainRecord, true);

    // 2) Determine what to display in the top "header" area
    let headerLeftHtml = "";
    let headerRightButtonHtml = "";

    if (user) {
        // Logged-in scenario: show user profile image + username
        const imageUrl = user.image && user.image.length
            ? user.image
            : "assets/default-profile.png";

        headerLeftHtml = `
      <img src="${imageUrl}" alt="Profile" class="coupons-profile-image" />
      <span class="user-label">@${user.username}</span>
    `;
        // Logged-in user sees a "Logout" button
        headerRightButtonHtml = `<button id="logoutButton" class="coupons-logout-button">Logout</button>`;
    } else {
        // Guest scenario: show default image + "Guest"
        headerLeftHtml = `
      <img src="assets/default-profile.png" alt="Profile" class="coupons-profile-image" />
      <span class="user-label">Guest</span>
    `;
        headerRightButtonHtml = `<button id="loginButton" class="logout-button">Login</button>`;
    }

    // 3) Inject the main HTML structure
    authContainer.innerHTML = `
    <div class="coupons-profile-card fade-in-up">
      <!-- Minimal "profile" row on top (like a header) -->
      <div class="coupons-profile-row">
        <div class="coupons-profile-info">
          ${headerLeftHtml}
        </div>
        ${headerRightButtonHtml}
      </div>

      <h3 class="coupon-header">Coupons for ${domainRecord.domain}:</h3>
      <div id="couponList" class="coupon-list">
        ${
        coupons.length === 0
            ? `<p>No coupons found for this site</p>`
            : coupons
                .map(
                    (c) => `
                    <div class="coupon-item">
                      <div class="coupon-title">${c.title || "Untitled Coupon"}</div>
                      <div class="coupon-desc">${c.description || ""}</div>
                      <div class="coupon-action">
                        <button 
                          class="copyBtn" 
                          data-code="${c.code}"
                        >
                          Copy "${c.code}"
                        </button>
                      </div>
                    </div>
                  `
                )
                .join("")
    }
      </div>
    </div>
  `;

    // 4) Wire up the "Logout" or "Login" button
    if (user) {
        document.getElementById("logoutButton").addEventListener("click", () => {
            currentBrowser.storage.sync.remove(["token", "user"], () => {
                // Now user is logged out -> show sign-in prompt for checkout
                renderSignInPrompt();
            });
        });
    } else {
        const loginBtn = document.getElementById("loginButton");
        if (loginBtn) {
            loginBtn.addEventListener("click", () => {
                renderSignInPrompt();
            });
        }
    }

    // 5) Copy button logic
    const copyButtons = authContainer.querySelectorAll(".copyBtn");
    copyButtons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const code = e.target.getAttribute("data-code");
            navigator.clipboard
                .writeText(code)
                .then(() => {
                    console.log(`Copied coupon code: ${code}`);
                })
                .catch((err) => console.error("Failed to copy code", err));
        });
    });
}

