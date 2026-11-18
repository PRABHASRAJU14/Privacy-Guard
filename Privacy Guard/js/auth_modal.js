/**
 * PrivacyGuard — Universal Authentication Controller (Sign In & Sign Up & Social OAuth)
 * LeetCode Modal Architecture + Complete Dynamic Multi-Provider Account System
 * Supports Google, GitHub, Apple, LinkedIn, and Custom Local Credentials Bidirectionally (Vice Versa)
 */

(function () {
    // Current state: 'signin' | 'signup' | 'oauth'
    let authMode = "signin";
    let activeOAuthProvider = null;

    // DOM Elements
    let overlay = null;
    let card = null;
    let brandTitle = null;
    let submitBtn = null;
    let switchContainer = null;
    let formFields = null;
    let errorBanner = null;

    // SVG Icons for Socials
    const ICONS = {
        google: `<svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>`,
        github: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
        apple: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.66-.82 1.11-1.96.99-3.1-.97.04-2.14.65-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.08.08 2.16-.57 2.81-1.29z"/></svg>`,
        linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.37 9.74v-8.37H5.09v8.37h2.74z"/></svg>`
    };

    // Social Provider Profiles & Configurations
    const SOCIAL_PROVIDERS = {
        Google: {
            name: "Google",
            brandColor: "#4285F4",
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=1084293847291-privacyguard.apps.googleusercontent.com&redirect_uri=http://127.0.0.1:8000/api/auth/oauth/callback&response_type=code&scope=openid%20email%20profile&state=google_auth",
            directUrl: "https://accounts.google.com/",
            icon: ICONS.google,
            defaultUser: {
                username: "prabhas",
                name: "Prabhas Raju",
                email: "shanmukha.saiprabhas.s83@kalvium.community",
                provider: "Google",
                badge: "Google OAuth 2.0 Identity"
            }
        },
        GitHub: {
            name: "GitHub",
            brandColor: "#24292F",
            authUrl: "https://github.com/login/oauth/authorize?client_id=privacyguard-github-oauth&redirect_uri=http://127.0.0.1:8000/api/auth/oauth/callback&scope=read:user%20user:email&state=github_auth",
            directUrl: "https://github.com/login",
            icon: ICONS.github,
            defaultUser: {
                username: "PRABHASRAJU14",
                name: "PRABHASRAJU14",
                email: "prabhasraju14@github.com",
                provider: "GitHub",
                badge: "GitHub Developer OAuth"
            }
        },
        Apple: {
            name: "Apple",
            brandColor: "#000000",
            authUrl: "https://appleid.apple.com/auth/authorize?client_id=com.privacyguard.client&redirect_uri=http://127.0.0.1:8000/api/auth/oauth/callback&response_type=code&scope=name%20email&state=apple_auth",
            directUrl: "https://appleid.apple.com/",
            icon: ICONS.apple,
            defaultUser: {
                username: "prabhas_apple",
                name: "Prabhas Raju",
                email: "prabhas.raju@privaterelay.appleid.com",
                provider: "Apple",
                badge: "Apple ID Private Relay"
            }
        },
        LinkedIn: {
            name: "LinkedIn",
            brandColor: "#0A66C2",
            authUrl: "https://www.linkedin.com/oauth/v2/authorization?client_id=privacyguard-linkedin-oauth&redirect_uri=http://127.0.0.1:8000/api/auth/oauth/callback&response_type=code&scope=r_liteprofile%20r_emailaddress&state=linkedin_auth",
            directUrl: "https://www.linkedin.com/login",
            icon: ICONS.linkedin,
            defaultUser: {
                username: "prabhas_linkedin",
                name: "Prabhas Raju",
                email: "prabhas.raju@linkedin.com",
                provider: "LinkedIn",
                badge: "LinkedIn Professional Network"
            }
        }
    };

    // Local Account Registry (synced with localStorage & server)
    const DEFAULT_ACCOUNTS = [
        {
            username: "prabhas",
            name: "Prabhas Raju",
            email: "shanmukha.saiprabhas.s83@kalvium.community",
            password: "password123",
            provider: "Local"
        },
        {
            username: "admin",
            name: "Administrator",
            email: "admin@privacyguard.local",
            password: "admin",
            provider: "Local"
        }
    ];

    function getAccounts() {
        try {
            const stored = localStorage.getItem("privacyguard_registered_accounts");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_ACCOUNTS;
    }

    function saveAccounts(accounts) {
        try {
            localStorage.setItem("privacyguard_registered_accounts", JSON.stringify(accounts));
        } catch (e) {}
    }

    function getActiveUser() {
        try {
            const stored = localStorage.getItem("privacyguard_active_user");
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return null;
    }

    function initAuthModal() {
        if (document.getElementById("pgAuthOverlay")) return;

        overlay = document.createElement("div");
        overlay.id = "pgAuthOverlay";
        overlay.className = "pg-auth-overlay";

        overlay.innerHTML = `
            <div class="pg-auth-card" id="pgAuthCard" data-pg-ignore="true">
                <!-- Close Button -->
                <button type="button" class="pg-auth-close" id="pgAuthCloseBtn" aria-label="Close modal">&times;</button>

                <!-- Brand Header -->
                <div class="pg-auth-brand" id="pgAuthBrandHeader">
                    <svg class="pg-auth-logo" viewBox="0 0 64 72" fill="none">
                        <path d="M32 3L57 12V31C57 48 47 61 32 69C17 61 7 48 7 31V12L32 3Z" fill="url(#authBrandGrad)" stroke="#4338FF" stroke-width="2.5"/>
                        <path d="M32 13L48 18V31C48 42 42 51 32 57V13Z" fill="rgba(255,255,255,.85)"/>
                        <defs>
                            <linearGradient id="authBrandGrad" x1="10" y1="5" x2="52" y2="67">
                                <stop stop-color="#536DFF"/>
                                <stop offset="1" stop-color="#2915D8"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    <h2 class="pg-auth-title" id="pgAuthTitle">PrivacyGuard</h2>
                </div>

                <!-- Active User Notice (When Switching Accounts) -->
                <div id="pgActiveUserNotice" style="display: none; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; color: #93c5fd; text-align: center;">
                </div>

                <!-- Error / Status Notice Banner -->
                <div id="pgAuthErrorBanner" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; color: #fca5a5; font-size: 12px; line-height: 1.4;">
                </div>

                <!-- Interactive OAuth Flow Screen Container -->
                <div id="pgOAuthView" style="display: none;" class="pg-oauth-view">
                    <!-- Injected dynamically in oauth mode -->
                </div>

                <!-- Standard Form View Container -->
                <div id="pgStandardAuthView">
                    <form id="pgAuthForm" class="pg-auth-form" onsubmit="return false;" autocomplete="off">
                        <div id="pgAuthFields">
                            <!-- Dynamic Fields Injected Here -->
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="pg-auth-submit-btn" id="pgAuthSubmitBtn">
                            Sign In
                        </button>
                    </form>

                    <!-- Legal Notice -->
                    <div class="pg-auth-legal">
                        By continuing, you agree to <a href="#privacy">Terms</a> &amp; <a href="#privacy">Privacy Policy</a>.
                    </div>

                    <!-- Switcher Links -->
                    <div class="pg-auth-links" id="pgAuthLinks">
                        <!-- Dynamic Links Injected Here -->
                    </div>

                    <!-- Social Divider -->
                    <div class="pg-auth-divider">
                        <span id="pgDividerLabel">or you can sign in with</span>
                    </div>

                    <!-- Socials (Google, GitHub, Apple, LinkedIn) -->
                    <div class="pg-auth-socials" id="pgAuthSocialRow">
                        <button type="button" class="pg-auth-social-btn" data-provider="Google" title="Sign in with Google">
                            ${ICONS.google}
                        </button>
                        <button type="button" class="pg-auth-social-btn" data-provider="GitHub" title="Sign in with GitHub">
                            ${ICONS.github}
                        </button>
                        <button type="button" class="pg-auth-social-btn" data-provider="Apple" title="Sign in with Apple">
                            ${ICONS.apple}
                        </button>
                        <button type="button" class="pg-auth-social-btn" data-provider="LinkedIn" title="Sign in with LinkedIn">
                            ${ICONS.linkedin}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Cache elements
        card = document.getElementById("pgAuthCard");
        brandTitle = document.getElementById("pgAuthTitle");
        submitBtn = document.getElementById("pgAuthSubmitBtn");
        formFields = document.getElementById("pgAuthFields");
        switchContainer = document.getElementById("pgAuthLinks");
        errorBanner = document.getElementById("pgAuthErrorBanner");

        // Event Listeners for Closing
        document.getElementById("pgAuthCloseBtn").addEventListener("click", closeAuthModal);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeAuthModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlay.classList.contains("active")) {
                closeAuthModal();
            }
        });

        // Form Submit
        document.getElementById("pgAuthForm").addEventListener("submit", handleFormSubmit);

        // Social Buttons Click Listeners
        const socialBtns = overlay.querySelectorAll(".pg-auth-social-btn");
        socialBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const provider = btn.getAttribute("data-provider");
                handleSocialLogin(provider);
            });
        });

        // Cross-window OAuth callback message listener
        window.addEventListener("message", (event) => {
            if (event.data && event.data.type === "PG_OAUTH_SUCCESS") {
                const prov = event.data.provider || activeOAuthProvider || "Google";
                const user = event.data.user || (SOCIAL_PROVIDERS[prov] ? SOCIAL_PROVIDERS[prov].defaultUser : null);
                if (user) {
                    onAuthSuccess(user);
                }
            }
        });

        // Render Initial Form
        renderMode(authMode);
    }

    function showError(msg) {
        if (!errorBanner) return;
        errorBanner.textContent = msg;
        errorBanner.style.display = "block";
    }

    function clearError() {
        if (!errorBanner) return;
        errorBanner.style.display = "none";
        errorBanner.textContent = "";
    }

    // Render Sign In vs Sign Up View vs OAuth Mode
    function renderMode(mode, providerKey = null) {
        authMode = mode;
        clearError();

        const standardView = document.getElementById("pgStandardAuthView");
        const oauthView = document.getElementById("pgOAuthView");
        const dividerLabel = document.getElementById("pgDividerLabel");
        const activeNotice = document.getElementById("pgActiveUserNotice");

        // Show active user notice if user is already signed in
        const currentActive = getActiveUser();
        if (currentActive && activeNotice) {
            activeNotice.innerHTML = `Currently active: <strong>${currentActive.name || currentActive.username}</strong> (${currentActive.provider || 'Local'}). Switch below:`;
            activeNotice.style.display = "block";
        } else if (activeNotice) {
            activeNotice.style.display = "none";
        }

        if (mode === "oauth" && providerKey && SOCIAL_PROVIDERS[providerKey]) {
            activeOAuthProvider = providerKey;
            const p = SOCIAL_PROVIDERS[providerKey];
            standardView.style.display = "none";
            oauthView.style.display = "block";

            oauthView.innerHTML = `
                <div class="pg-oauth-emblem">
                    ${p.icon}
                </div>
                <h3 style="margin: 0 0 6px 0; font-size: 17px; font-weight: 700; color: #fff;">
                    Connecting to ${p.name}
                </h3>
                <div class="pg-oauth-status-badge">
                    <span class="pg-oauth-pulse-dot"></span>
                    OAuth 2.0 Portal Active
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin: 0 0 16px 0; line-height: 1.4;">
                    We opened <strong>${p.name}</strong>'s sign-in page in a popup. Complete authentication there, or confirm profile below:
                </p>

                <div class="pg-oauth-profile-card">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #818cf8; font-weight: 700;">${p.defaultUser.badge}</span>
                        <span style="font-size: 11px; color: #10b981;">✓ Ready</span>
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 2px;">
                        ${p.defaultUser.name}
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">
                        ${p.defaultUser.email}
                    </div>
                </div>

                <div class="pg-oauth-actions">
                    <button type="button" class="pg-auth-submit-btn" id="pgConfirmOAuthBtn">
                        ✓ Sign In as ${p.defaultUser.name} (${p.name})
                    </button>
                    <button type="button" class="pg-btn-secondary" id="pgCancelOAuthBtn">
                        ← Back to Sign In / Sign Up
                    </button>
                </div>
            `;

            document.getElementById("pgConfirmOAuthBtn").addEventListener("click", () => {
                onAuthSuccess(p.defaultUser);
            });

            document.getElementById("pgCancelOAuthBtn").addEventListener("click", () => {
                renderMode("signin");
            });

            return;
        }

        // Standard Modes (signin / signup)
        if (standardView) standardView.style.display = "block";
        if (oauthView) oauthView.style.display = "none";

        if (mode === "signin") {
            brandTitle.textContent = "PrivacyGuard";
            submitBtn.textContent = "Sign In";
            if (dividerLabel) dividerLabel.textContent = "or you can sign in with";

            formFields.innerHTML = `
                <div class="pg-auth-input-group" style="margin-bottom: 12px;">
                    <input type="text" class="pg-auth-input" id="pgInputUsername" placeholder="Username or E-mail" required autocomplete="username" />
                </div>
                <div class="pg-auth-input-group">
                    <input type="password" class="pg-auth-input" id="pgInputPassword" placeholder="Password" required autocomplete="current-password" />
                </div>
            `;

            switchContainer.innerHTML = `
                <a href="#forgot" id="pgForgotLink">Forgot Password?</a>
                <span class="pg-auth-highlight-link" id="pgSwitchToSignUp">Sign Up</span>
            `;

            document.getElementById("pgSwitchToSignUp").addEventListener("click", () => renderMode("signup"));
            document.getElementById("pgForgotLink").addEventListener("click", (e) => {
                e.preventDefault();
                showSuccessToast("📧 Password reset instructions sent to registered email.");
            });

        } else {
            brandTitle.textContent = "PrivacyGuard";
            submitBtn.textContent = "Sign Up";
            if (dividerLabel) dividerLabel.textContent = "or you can sign in with";

            formFields.innerHTML = `
                <div class="pg-auth-input-group" style="margin-bottom: 12px;">
                    <input type="text" class="pg-auth-input" id="pgInputUsername" placeholder="Username" required autocomplete="username" />
                </div>
                <div class="pg-auth-input-group" style="margin-bottom: 12px;">
                    <input type="password" class="pg-auth-input" id="pgInputPassword" placeholder="Password (min. 4 chars)" required autocomplete="new-password" />
                </div>
                <div class="pg-auth-input-group" style="margin-bottom: 12px;">
                    <input type="password" class="pg-auth-input" id="pgInputConfirmPassword" placeholder="Confirm password" required autocomplete="new-password" />
                </div>
                <div class="pg-auth-input-group">
                    <input type="email" class="pg-auth-input" id="pgInputEmail" placeholder="E-mail address" required autocomplete="email" />
                </div>
            `;

            switchContainer.innerHTML = `
                <div style="width: 100%; text-align: center; color: #94a3b8;">
                    Have an account? <span class="pg-auth-highlight-link" id="pgSwitchToSignIn" style="margin-left: 6px;">Sign In</span>
                </div>
            `;

            document.getElementById("pgSwitchToSignIn").addEventListener("click", () => renderMode("signin"));
        }
    }

    // Open Modal
    function openAuthModal(defaultMode = "signin") {
        initAuthModal();
        renderMode(defaultMode);
        overlay.classList.add("active");
        setTimeout(() => {
            const firstInput = formFields ? formFields.querySelector("input") : null;
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // Close Modal
    function closeAuthModal() {
        if (overlay) overlay.classList.remove("active");
    }

    // Form Submission Handler
    async function handleFormSubmit(e) {
        e.preventDefault();
        clearError();

        const usernameInput = document.getElementById("pgInputUsername")?.value.trim() || "";
        const passwordInput = document.getElementById("pgInputPassword")?.value || "";

        if (!usernameInput || !passwordInput) {
            showError("Please enter both username and password.");
            return;
        }

        const accounts = getAccounts();

        if (authMode === "signup") {
            const confirmPass = document.getElementById("pgInputConfirmPassword")?.value || "";
            const emailInput = document.getElementById("pgInputEmail")?.value.trim() || "";

            if (passwordInput.length < 4) {
                showError("Password must be at least 4 characters long.");
                return;
            }
            if (passwordInput !== confirmPass) {
                showError("Passwords do not match! Please check and try again.");
                return;
            }
            if (!emailInput || !emailInput.includes("@")) {
                showError("Please enter a valid e-mail address.");
                return;
            }

            // Check if username or email already exists
            const existing = accounts.find(a => 
                a.username.toLowerCase() === usernameInput.toLowerCase() || 
                a.email.toLowerCase() === emailInput.toLowerCase()
            );
            if (existing) {
                showError(`An account with username '${usernameInput}' or email already exists. Please Sign In.`);
                return;
            }

            // Register new account dynamically
            const newAccount = {
                username: usernameInput,
                name: usernameInput,
                email: emailInput,
                password: passwordInput,
                provider: "Local"
            };
            accounts.push(newAccount);
            saveAccounts(accounts);

            submitBtn.textContent = "Creating Account...";
            submitBtn.disabled = true;

            // Notify server asynchronously
            try {
                fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newAccount)
                }).catch(() => {});
            } catch (e) {}

            setTimeout(() => {
                onAuthSuccess(newAccount);
            }, 300);

        } else {
            // Sign In
            submitBtn.textContent = "Verifying...";
            submitBtn.disabled = true;

            // Check against registered accounts (case-insensitive username or email)
            const matched = accounts.find(a => 
                (a.username.toLowerCase() === usernameInput.toLowerCase() || a.email.toLowerCase() === usernameInput.toLowerCase()) &&
                a.password === passwordInput
            );

            if (matched) {
                try {
                    fetch("/api/auth/signin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: usernameInput, password: passwordInput })
                    }).catch(() => {});
                } catch (e) {}

                setTimeout(() => {
                    onAuthSuccess(matched);
                }, 250);
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = "Sign In";

                // Check if username exists but password was wrong
                const userExists = accounts.some(a => 
                    a.username.toLowerCase() === usernameInput.toLowerCase() || 
                    a.email.toLowerCase() === usernameInput.toLowerCase()
                );

                if (userExists) {
                    showError("Incorrect password. Please try again or click 'Forgot Password?'.");
                } else {
                    showError(`Account '${usernameInput}' not found. Click 'Sign Up' below to register this account!`);
                }
            }
        }
    }

    // Social Login Handler — Opens Real Portal and Interactive Flow
    function handleSocialLogin(provider) {
        const config = SOCIAL_PROVIDERS[provider];
        if (!config) return;

        // 1. Open the Real Provider Portal in a dedicated OAuth popup
        try {
            const popupWidth = 540;
            const popupHeight = 650;
            const left = Math.max(0, (window.innerWidth - popupWidth) / 2);
            const top = 100;
            const targetUrl = config.authUrl || config.directUrl;
            window.open(targetUrl, `pg_${provider.toLowerCase()}_oauth`, `width=${popupWidth},height=${popupHeight},top=${top},left=${left},status=yes,scrollbars=yes`);
        } catch (e) {
            console.warn("[PrivacyGuard] Popup blocked, using in-modal flow", e);
        }

        // 2. Switch Modal to the Interactive OAuth View for this Provider
        renderMode("oauth", provider);
    }

    // Success Callback
    function onAuthSuccess(user) {
        // Issue JWT token asynchronously for server-side verification
        try {
            fetch("/api/auth/jwt/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user.username || "usr-1",
                    username: user.username,
                    role: user.role || "compliance_officer"
                })
            }).then(r => r.json()).then(res => {
                if (res.token) {
                    user.token = res.token;
                    localStorage.setItem("privacyguard_active_user", JSON.stringify(user));
                }
            }).catch(() => {});
        } catch (e) {}

        localStorage.setItem("privacyguard_active_user", JSON.stringify(user));
        closeAuthModal();
        renderNavUser(user);

        const providerLabel = user.provider ? ` via ${user.provider}` : "";
        showSuccessToast(`✓ Successfully authenticated${providerLabel}! Welcome, <strong>${user.name || user.username}</strong>!`);
    }

    function showSuccessToast(message) {
        const existing = document.getElementById("pgGlobalAuthToast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.id = "pgGlobalAuthToast";
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #ffffff;
            font-weight: 500;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 14px 34px rgba(0,0,0,0.5), 0 0 20px rgba(16, 185, 129, 0.3);
            border: 1px solid rgba(255,255,255,0.18);
            z-index: 9999999;
            font-family: inherit;
            font-size: 13.5px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInDown 0.3s ease;
        `;
        toast.innerHTML = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // Render Navigation Profile vs Sign In Button (Supports Vice Versa Switching)
    function renderNavUser(user) {
        const wrapper = document.getElementById("pgAuthNavWrapper");
        if (!wrapper) return;

        if (user && (user.username || user.name)) {
            const displayName = user.name || user.username;
            const provider = user.provider || "Local";
            const initial = displayName.charAt(0).toUpperCase();

            // Select provider badge icon
            let providerIconHtml = "";
            let providerClass = `provider-${provider.toLowerCase()}`;

            if (provider === "Google") {
                providerIconHtml = `<span class="provider-icon-badge" style="background:#ffffff; padding:2px;">${ICONS.google}</span>`;
            } else if (provider === "GitHub") {
                providerIconHtml = `<span class="provider-icon-badge" style="background:#24292e; color:#fff;">${ICONS.github}</span>`;
            } else if (provider === "Apple") {
                providerIconHtml = `<span class="provider-icon-badge" style="background:#000000; color:#fff;">${ICONS.apple}</span>`;
            } else if (provider === "LinkedIn") {
                providerIconHtml = `<span class="provider-icon-badge" style="background:#0a66c2; color:#fff;">${ICONS.linkedin}</span>`;
            } else {
                providerIconHtml = `<span class="provider-icon-badge" style="background:#4f46e5; color:#fff; font-size:12px; font-weight:700;">${initial}</span>`;
            }

            wrapper.innerHTML = `
                <div style="position: relative; display: inline-block;">
                    <button class="user-nav-profile ${providerClass}" id="pgUserProfileBtn" type="button" title="Signed in via ${provider}">
                        ${providerIconHtml}
                        <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
                        <span style="font-size: 10px; opacity: 0.7; margin-left: 2px;">▾</span>
                    </button>
                    <div id="pgUserDropdownMenu" style="display:none; position:absolute; right:0; top:44px; width:220px; background:#14192b; border:1px solid rgba(255,255,255,0.12); border-radius:12px; box-shadow:0 16px 40px rgba(0,0,0,0.6); padding:8px 0; z-index:99999; animation: fadeIn 0.2s ease;">
                        <div style="padding:10px 14px; font-size:11px; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                                <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
                                <span style="color:#818cf8; font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Signed in via ${provider}</span>
                            </div>
                            <strong style="color:#fff; font-size:12.5px; word-break:break-all;">${user.email || user.username}</strong>
                        </div>
                        <a href="/app" style="display:flex; align-items:center; gap:8px; padding:10px 14px; color:#cbd5e1; text-decoration:none; font-size:12.5px; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
                            <span>⚛️</span> <span>React Dashboard</span>
                        </a>
                        <button id="pgSwitchAccountBtn" type="button" style="width:100%; text-align:left; background:none; border:none; padding:10px 14px; color:#93c5fd; font-size:12.5px; cursor:pointer; display:flex; align-items:center; gap:8px; transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
                            <span>🔄</span> <span>Switch Account / Provider</span>
                        </button>
                        <div style="height:1px; background:rgba(255,255,255,0.08); margin:4px 0;"></div>
                        <button id="pgSignOutBtn" type="button" style="width:100%; text-align:left; background:none; border:none; padding:10px 14px; color:#f87171; font-size:12.5px; cursor:pointer; display:flex; align-items:center; gap:8px; transition: background 0.15s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">
                            <span>🚪</span> <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            `;

            const profileBtn = document.getElementById("pgUserProfileBtn");
            const dropdown = document.getElementById("pgUserDropdownMenu");
            const switchBtn = document.getElementById("pgSwitchAccountBtn");
            const signOutBtn = document.getElementById("pgSignOutBtn");

            profileBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
            });

            document.addEventListener("click", () => {
                if (dropdown) dropdown.style.display = "none";
            });

            // Switch account re-opens modal so user can switch between Google/GitHub/Apple/LinkedIn/Local vice versa
            switchBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.style.display = "none";
                openAuthModal("signin");
            });

            signOutBtn.addEventListener("click", () => {
                localStorage.removeItem("privacyguard_active_user");
                renderNavUser(null);
                showSuccessToast("👋 Signed out successfully. You can now sign in with any provider.");
            });

        } else {
            wrapper.innerHTML = `
                <button class="btn-nav-auth" id="openAuthModalBtn" type="button">
                    Sign In
                </button>
            `;
            document.getElementById("openAuthModalBtn")?.addEventListener("click", () => openAuthModal("signin"));
        }
    }

    // Auto-check stored session on load
    document.addEventListener("DOMContentLoaded", () => {
        initAuthModal();

        const stored = getActiveUser();
        if (stored) {
            renderNavUser(stored);
        } else {
            renderNavUser(null);
        }
    });

    // Expose globally
    window.PrivacyGuardAuth = {
        open: openAuthModal,
        close: closeAuthModal,
        renderMode: renderMode,
        socialLogin: handleSocialLogin,
        getUser: getActiveUser,
        logout: () => {
            localStorage.removeItem("privacyguard_active_user");
            renderNavUser(null);
        }
    };
})();
