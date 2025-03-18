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

    // Listen for messages from the login window (sent via postMessage)
    window.addEventListener("message", (event) => {
        console.log(event);
        if (event.origin !== "https://grabcaramel.com") return;
        if (event.data && event.data.token) {
            // Keep only the essential data for the user
            const user = {
                username: event.data.username || "CaramelUser",
                image: event.data.image,
            };
            currentBrowser.storage.sync.set({ token: event.data.token, user }, () => {
                renderProfileCard(user);
            });
        }
    });
});

function renderSignInPrompt() {
    const authContainer = document.getElementById("auth-container");
    authContainer.innerHTML = `
    <div class="login-prompt fade-in-up">
      <h2>Sign In to Caramel</h2>
      <p>In order to start using our coupons, please sign in!</p>
      <button id="loginButton" class="login-button">Sign In</button>
    </div>
  `;
    document.getElementById("loginButton").addEventListener("click", () => {
        window.open(
            "https://grabcaramel.com/login?extension=true",
            "loginWindow",
            "width=500,height=600"
        );
    });
    // Hide the settings icon when not logged in
    document.getElementById("settingsIcon").style.display = "none";
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
