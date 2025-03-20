// popup.js
const currentBrowser = (() => {
    if (typeof chrome !== "undefined") return chrome;
    if (typeof browser !== "undefined") return browser;
    throw new Error("Browser is not supported!");
})();

document.addEventListener("DOMContentLoaded", async () => {
    // Remove the loading overlay after a short delay
    const loadingContainer = document.getElementById("loading-container");
    if (loadingContainer) {
        setTimeout(() => {
            loadingContainer.style.display = "none";
        }, 400);
    }

    const mainContent = document.getElementById("mainContent");
    let authContainer = document.getElementById("auth-container");
    if (!authContainer) {
        authContainer = document.createElement("div");
        authContainer.id = "auth-container";
        mainContent.appendChild(authContainer);
    }

    // Check for an existing token and user info in chrome storage.
    currentBrowser.storage.sync.get(["token", "user"], (result) => {
        if (result.token) {
            renderProfileCard(result.user);
        } else {
            renderSignInPrompt();
        }
    });
});

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

        // Grab the error message element
        const errorMessageElem = document.getElementById("loginErrorMessage");
        // Reset visibility each time user attempts login
        errorMessageElem.style.display = "none";
        errorMessageElem.textContent = "";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            // Call your Next.js endpoint at /extension/login (adjust as needed)
            const response = await fetch("https://grabcaramel.com/api/extension/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Login failed");
            }

            // Parse the result: { token, username, image }
            const { token, username, image } = await response.json();
            const user = { username, image };

            // Store token/user in extension storage
            currentBrowser.storage.sync.set({ token, user }, () => {
                // Now render the "logged in" UI
                renderProfileCard(user);
            });
        } catch (err) {
            console.error("Login error:", err);
            // Show the error message in the box above the form
            errorMessageElem.textContent = `Login failed: ${err.message}`;
            errorMessageElem.style.display = "block";
        }
    });
}

function renderProfileCard(user) {
    const authContainer = document.getElementById("auth-container");
    // Use the user's image if provided; otherwise, use a default image.
    const imageUrl = user.image && user.image.length
        ? user.image
        : "assets/default-profile.png";

    authContainer.innerHTML = `
    <div class="profile-card fade-in-up">
      <img src="${imageUrl}" alt="Profile" class="profile-image" />
      <div class="welcome-message">Welcome back, ${user.username}!</div>
      <div class="username">@${user.username}</div>
      <div class="profile-actions">
        <button id="settingsButton" class="settings-button">Profile</button>
        <button id="logoutButton" class="logout-button">Logout</button>
      </div>
    </div>
  `;

    // Show the settings icon in the header
    const settingsIcon = document.getElementById("settingsIcon");
    settingsIcon.style.display = "block";
    settingsIcon.onclick = () => {
        window.open("https://grabcaramel.com/profile", "_blank");
    };

    document
        .getElementById("settingsButton")
        .addEventListener("click", () => {
            window.open("https://grabcaramel.com/profile", "_blank");
        });

    document.getElementById("logoutButton").addEventListener("click", () => {
        currentBrowser.storage.sync.remove(["token", "user"], () => {
            window.location.reload();
        });
    });
}
