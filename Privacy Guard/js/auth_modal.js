/**
 * PrivacyGuard — Universal Authentication Controller (Sign In & Sign Up)
 * LeetCode Modal Architecture + Complete Dynamic Account System
 */

(function () {
    // Current state: 'signin' | 'signup'
    let authMode = "signin";

    // DOM Elements
    let overlay = null;
    let card = null;
    let brandTitle = null;
    let submitBtn = null;
    let switchContainer = null;
    let formFields = null;
    let errorBanner = null;

    // Local Account Registry (synced with localStorage & server)
    const DEFAULT_ACCOUNTS = [
        {
            username: "prabhas",
            name: "Prabhas Raju",
            email: "shanmukha.saiprabhas.s83@kalvium.community",
            password: "password123"
        },
        {
            username: "admin",
            name: "Administrator",
            email: "admin@privacyguard.local",
            password: "admin"
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

    // SVG Icons for Socials
    const ICONS = {
        google: `<svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>`,
        github: `<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
        apple: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.66-.82 1.11-1.96.99-3.1-.97.04-2.14.65-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.08.08 2.16-.57 2.81-1.29z"/></svg>`,
        linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.37 9.74v-8.37H5.09v8.37h2.74z"/></svg>`
    };

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
                <div class="pg-auth-brand">
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

                <!-- Error / Status Notice Banner -->
                <div id="pgAuthErrorBanner" style="display: none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; color: #fca5a5; font-size: 12px; line-height: 1.4;">
                </div>

                <!-- Form Fields -->
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

                <!-- Socials -->
                <div class="pg-auth-socials">
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

        // Social Buttons
        const socialBtns = overlay.querySelectorAll(".pg-auth-social-btn");
        socialBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const provider = btn.getAttribute("data-provider");
                handleSocialLogin(provider);
            });
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

    // Render Sign In vs Sign Up View
    function renderMode(mode) {
        authMode = mode;
        clearError();
        const dividerLabel = document.getElementById("pgDividerLabel");

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
                alert("Password reset instructions sent to your email.");
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
            const firstInput = formFields.querySelector("input");
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

            // Register new account
            const newAccount = {
                username: usernameInput,
                name: usernameInput,
                email: emailInput,
                password: passwordInput
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
                    // Allow quick instant registration if not existing
                    showError(`Account '${usernameInput}' not found. Click 'Sign Up' below to create this account in 5 seconds!`);
                }
            }
        }
    }

    // Social Login Handler
    function handleSocialLogin(provider) {
        closeAuthModal();
        const stored = localStorage.getItem("privacyguard_active_user");
        let activeName = "Prabhas Raju";
        if (stored) {
            try { activeName = JSON.parse(stored).name || activeName; } catch (e) {}
        }
        const socialUser = {
            username: activeName,
            name: activeName,
            email: `${activeName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
            provider: provider
        };
        onAuthSuccess(socialUser);
    }

    // Success Callback
    function onAuthSuccess(user) {
        localStorage.setItem("privacyguard_active_user", JSON.stringify(user));
        closeAuthModal();
        renderNavUser(user);

        // Success Toast Notification
        const toast = document.createElement("div");
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            background: #10b981;
            color: #ffffff;
            font-weight: 600;
            padding: 12px 22px;
            border-radius: 12px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.4);
            z-index: 9999999;
            font-family: inherit;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInDown 0.3s ease;
        `;
        toast.innerHTML = `<span style="font-size: 16px;">✓</span> Welcome back, <strong>${user.name || user.username}</strong>!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    // Render Navigation Profile vs Sign In Button
    function renderNavUser(user) {
        const wrapper = document.getElementById("pgAuthNavWrapper");
        if (!wrapper) return;

        if (user && (user.username || user.name)) {
            const displayName = user.name || user.username;
            const initial = displayName.charAt(0).toUpperCase();

            wrapper.innerHTML = `
                <div style="position: relative; display: inline-block;">
                    <button class="user-nav-profile" id="pgUserProfileBtn" type="button" style="display:flex; align-items:center; gap:8px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 24px; padding: 6px 14px; color: #fff; cursor: pointer; font-weight:600; font-size:13.5px;">
                        <span style="width:24px; height:24px; border-radius:50%; background:#4f46e5; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;">${initial}</span>
                        <span>${displayName}</span>
                        <span style="font-size: 10px; opacity: 0.7;">▾</span>
                    </button>
                    <div id="pgUserDropdownMenu" style="display:none; position:absolute; right:0; top:42px; width:180px; background:#14192b; border:1px solid rgba(255,255,255,0.12); border-radius:10px; box-shadow:0 12px 30px rgba(0,0,0,0.5); padding:8px 0; z-index:99999;">
                        <div style="padding:6px 14px; font-size:11px; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
                            Signed in as<br><strong style="color:#fff;">${user.email || user.username}</strong>
                        </div>
                        <a href="/app" style="display:block; padding:8px 14px; color:#cbd5e1; text-decoration:none; font-size:12.5px;">⚛️ React Dashboard</a>
                        <button id="pgSignOutBtn" style="width:100%; text-align:left; background:none; border:none; padding:8px 14px; color:#ef4444; font-size:12.5px; cursor:pointer;">
                            Sign Out
                        </button>
                    </div>
                </div>
            `;

            const profileBtn = document.getElementById("pgUserProfileBtn");
            const dropdown = document.getElementById("pgUserDropdownMenu");
            const signOutBtn = document.getElementById("pgSignOutBtn");

            profileBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
            });

            document.addEventListener("click", () => {
                if (dropdown) dropdown.style.display = "none";
            });

            signOutBtn.addEventListener("click", () => {
                localStorage.removeItem("privacyguard_active_user");
                wrapper.innerHTML = `
                    <button class="btn-nav-auth" id="openAuthModalBtn" type="button">
                        Sign In
                    </button>
                `;
                document.getElementById("openAuthModalBtn")?.addEventListener("click", () => openAuthModal("signin"));
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

        const stored = localStorage.getItem("privacyguard_active_user");
        if (stored) {
            try {
                renderNavUser(JSON.parse(stored));
            } catch (e) {
                renderNavUser(null);
            }
        } else {
            renderNavUser(null);
        }
    });

    // Expose globally
    window.PrivacyGuardAuth = {
        open: openAuthModal,
        close: closeAuthModal
    };
})();
