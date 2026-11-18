/**
 * PrivacyGuard — Universal Content Script (Manifest V3)
 * Injected on web pages to provide continuous, live,
 * real-time personal data leak prevention.
 *
 * Capabilities:
 * 1. Immediate Page-Load Scanning (detects pre-filled forms immediately).
 * 2. Real-Time Local Regex Engine (<5ms instant response on typing/paste).
 * 3. MutationObserver (automatically tracks dynamically created inputs/modals).
 * 4. Interactive Floating Shield & Redaction Workspace.
 * 5. Direct 1-Click Form Redaction with simulated synthetic events for React/Vue/Angular.
 * 6. Form Submission Protection Guard against accidental PII leaks.
 *
 * Excludes: Internal Auth Modals, Password fields, and Static Landing Demo Cards.
 */

(function () {
    if (window.__privacyGuardUniversalInjected) return;
    window.__privacyGuardUniversalInjected = true;

    // Helper: Determine if an element should be ignored by the PII scanner
    function isIgnoredElement(el) {
        if (!el || !(el instanceof Element)) return true;
        // Never scan passwords, hidden inputs, or buttons
        if (el.type === "password" || el.type === "hidden" || el.type === "submit" || el.type === "button") return true;
        // Never scan inside PrivacyGuard's own UI, Auth modal, or landing page sandbox
        if (el.id === "customInputText") return true;
        if (el.closest && (
            el.closest("#privacyguard-live-root") ||
            el.closest("#pgAuthOverlay") ||
            el.closest(".pg-auth-card") ||
            el.closest(".mockup-stage") ||
            el.closest(".scanner-card") ||
            el.closest(".tester-card") ||
            el.closest(".tester-grid") ||
            el.closest("#features")
        )) return true;
        // Never scan elements marked with pg IDs or ignore flags
        if (el.id && el.id.startsWith("pg")) return true;
        if (el.getAttribute("data-pg-ignore") === "true") return true;
        return false;
    }

    // ========================================================================
    // 1. DETERMINISTIC CLIENT-SIDE REGEX ENGINE (Instant <5ms on-page detection)
    // ========================================================================
    function localDetectPII(text) {
        if (!text || typeof text !== "string") return [];
        const items = [];

        // 1. Bank Account Number (match before Aadhaar to prioritize financial accounts)
        const bankRegex = /\b(?:bank\s*(?:account|acc|a\/c)?|account|acc|a\/c)[\s#:]*([0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{3,8}|[0-9]{9,18})\b/gi;
        let m;
        while ((m = bankRegex.exec(text)) !== null) {
            const val = m[1];
            const valStart = m.index + m[0].indexOf(val);
            items.push({
                type: "bank_account",
                label: "Bank Account Number",
                value: val,
                category: "financial",
                severity: "HIGH",
                risk_weight: 30,
                start: valStart,
                end: valStart + val.length
            });
        }

        // 2. Aadhaar (12 digits with optional spaces, excluding bank account spans)
        const aadhaarRegex = /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g;
        while ((m = aadhaarRegex.exec(text)) !== null) {
            if (!items.some(i => i.type === "bank_account" && i.start <= m.index && i.end >= m.index + m[0].length)) {
                items.push({
                    type: "aadhaar",
                    label: "Aadhaar Number",
                    value: m[0],
                    category: "identity",
                    severity: "HIGH",
                    risk_weight: 35,
                    start: m.index,
                    end: m.index + m[0].length
                });
            }
        }

        // 3. PAN Card (5 letters, 4 digits, 1 letter)
        const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
        while ((m = panRegex.exec(text)) !== null) {
            items.push({
                type: "pan",
                label: "PAN Card Number",
                value: m[0],
                category: "identity",
                severity: "HIGH",
                risk_weight: 30,
                start: m.index,
                end: m.index + m[0].length
            });
        }

        // 4. Payment Card (16 digits with spaces or hyphens)
        const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
        while ((m = cardRegex.exec(text)) !== null) {
            if (!items.some(i => (i.type === "aadhaar" || i.type === "bank_account") && i.start === m.index)) {
                items.push({
                    type: "card",
                    label: "Credit / Debit Card",
                    value: m[0],
                    category: "financial",
                    severity: "HIGH",
                    risk_weight: 35,
                    start: m.index,
                    end: m.index + m[0].length
                });
            }
        }

        // 5. UPI ID (support standard handles like rahul@bank, name@okhdfcbank, user@paytm)
        const upiRegex = /\b[a-zA-Z0-9.\-_]{2,64}@(?!company\.com|example\.com|gmail\.com|yahoo\.com|outlook\.com)[a-zA-Z0-9.\-_]{2,32}\b/g;
        while ((m = upiRegex.exec(text)) !== null) {
            items.push({
                type: "upi",
                label: "UPI ID / VPA",
                value: m[0],
                category: "financial",
                severity: "HIGH",
                risk_weight: 25,
                start: m.index,
                end: m.index + m[0].length
            });
        }

        // 6. Available Balance (Account Balance)
        const balanceRegex = /\b(?:available\s+balance|avail\.?\s*bal(?:ance)?|balance)[\s#:]*(?:₹|Rs\.?|INR)?\s?([\d,]+(?:\.\d{2})?)/gi;
        while ((m = balanceRegex.exec(text)) !== null) {
            items.push({
                type: "balance",
                label: "Account Balance",
                value: m[0],
                category: "financial",
                severity: "HIGH",
                risk_weight: 25,
                start: m.index,
                end: m.index + m[0].length
            });
        }

        // 7. Unrelated Personal Transactions
        const otherTxnRegex = /(?:Amazon|Swiggy|Electricity|Zomato|Flipkart|Netflix)[\s–-]+(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d{2})?/gi;
        while ((m = otherTxnRegex.exec(text)) !== null) {
            items.push({
                type: "unrelated_transaction",
                label: "Unrelated Personal Transaction",
                value: m[0],
                category: "financial",
                severity: "MEDIUM",
                risk_weight: 15,
                start: m.index,
                end: m.index + m[0].length
            });
        }

        // 6. Indian Mobile Phone Number
        const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{9}\b/g;
        while ((m = phoneRegex.exec(text)) !== null) {
            if (!items.some(i => i.start <= m.index && i.end >= m.index + m[0].length)) {
                items.push({
                    type: "phone",
                    label: "Mobile Phone Number",
                    value: m[0],
                    category: "contact",
                    severity: "MEDIUM",
                    risk_weight: 20,
                    start: m.index,
                    end: m.index + m[0].length
                });
            }
        }

        // 7. Email Address
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        while ((m = emailRegex.exec(text)) !== null) {
            if (!items.some(i => i.type === "upi" && i.start === m.index)) {
                items.push({
                    type: "email",
                    label: "Email Address",
                    value: m[0],
                    category: "contact",
                    severity: "MEDIUM",
                    risk_weight: 15,
                    start: m.index,
                    end: m.index + m[0].length
                });
            }
        }

        // 8. Financial Amount (excluding already captured balance and unrelated transactions)
        const amountRegex = /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d{2})?/gi;
        while ((m = amountRegex.exec(text)) !== null) {
            if (!items.some(i => (i.type === "balance" || i.type === "unrelated_transaction") && i.start <= m.index && i.end >= m.index + m[0].length)) {
                items.push({
                    type: "amount",
                    label: "Transaction Amount",
                    value: m[0],
                    category: "financial",
                    severity: "LOW",
                    risk_weight: 10,
                    start: m.index,
                    end: m.index + m[0].length
                });
            }
        }

        return items;
    }

    function calculateLocalRisk(items) {
        if (!items || items.length === 0) return { score: 0, level: "LOW" };
        const raw = items.reduce((acc, i) => acc + (i.risk_weight || 15), 0);
        const score = Math.min(100, Math.round(raw));
        const level = score >= 70 ? "HIGH" : (score >= 40 ? "MEDIUM" : "LOW");
        return { score, level };
    }

    // Purpose minimization rules
    const PURPOSE_KEEP_RULES = {
        expense_reimbursement: ["amount", "date", "merchant"],
        bank_verification: ["bank_account", "ifsc", "name"],
        job_application: ["name", "email", "phone"],
        public_posting: []
    };

    function localRedact(text, detected, purpose) {
        const allowed = PURPOSE_KEEP_RULES[purpose] || ["amount", "date"];
        const sorted = [...(detected || [])].sort((a, b) => b.start - a.start);
        let result = text;
        let protectedCount = 0;

        for (const item of sorted) {
            if (!allowed.includes(item.type)) {
                const token = `[REDACTED ${item.type.toUpperCase()}]`;
                result = result.slice(0, item.start) + token + result.slice(item.end);
                protectedCount++;
            }
        }

        return {
            protectedText: result,
            protectedCount,
            exposureReduction: detected.length > 0 ? Math.round((protectedCount / detected.length) * 100) : 100
        };
    }

    // ========================================================================
    // 2. STATE & UI ELEMENTS
    // ========================================================================
    let floatingRoot = null;
    let floatingBadge = null;
    let floatingPanel = null;
    let activeInputTarget = null;
    let currentDetected = [];
    let currentRisk = { score: 0, level: "LOW" };
    let monitoredElements = new WeakSet();

    function createFloatingUI() {
        if (document.getElementById("privacyguard-live-root")) return;

        floatingRoot = document.createElement("div");
        floatingRoot.id = "privacyguard-live-root";
        floatingRoot.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.4;
        `;

        // Floating Pill Badge
        floatingBadge = document.createElement("div");
        floatingBadge.id = "privacyguard-live-pill";
        floatingBadge.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            background: #0f172a;
            color: #f8fafc;
            border: 1px solid rgba(99, 102, 241, 0.4);
            padding: 9px 16px;
            border-radius: 32px;
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
        `;
        floatingBadge.innerHTML = `
            <span style="font-size: 17px;">🛡️</span>
            <span id="pg-badge-label">PrivacyGuard Active</span>
        `;

        // Interactive Redaction Flyout Panel
        floatingPanel = document.createElement("div");
        floatingPanel.id = "privacyguard-live-panel";
        floatingPanel.style.cssText = `
            display: none;
            position: absolute;
            bottom: 56px;
            right: 0;
            width: 350px;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 14px;
            padding: 16px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
            color: #f8fafc;
            font-size: 12.5px;
            box-sizing: border-box;
        `;

        floatingPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
                <div style="font-weight: 700; color: #818cf8; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                    🛡️ PrivacyGuard Live Shield
                </div>
                <button id="pg-panel-close" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; line-height: 1;">&times;</button>
            </div>

            <div id="pg-panel-status" style="margin-bottom: 12px; font-size: 12px; color: #cbd5e1;">
                Scanning active webpage forms...
            </div>

            <div id="pg-detected-list" style="max-height: 140px; overflow-y: auto; margin-bottom: 14px; padding-right: 4px;">
            </div>

            <div style="margin-bottom: 14px;">
                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 5px; font-weight: 500;">
                    Select Purpose to Minimize Exposure:
                </label>
                <select id="pg-purpose-select" style="width: 100%; background: #1e293b; border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; color: #f8fafc; padding: 7px 10px; font-size: 12px; outline: none;">
                    <option value="expense_reimbursement" selected>💼 Expense Claim (Keeps Amount, Redacts Bank/UPI)</option>
                    <option value="bank_verification">🏦 Bank Verification (Keeps Account, Redacts Others)</option>
                    <option value="job_application">📄 Job Application (Keeps Name/Email, Redacts Numbers)</option>
                    <option value="public_posting">🌐 Public Social Share (Redacts All Sensitive Data)</option>
                </select>
            </div>

            <div style="display: flex; gap: 8px;">
                <button id="pg-redact-now-btn" style="flex: 1; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: white; border: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12.5px;">
                    🛡️ Protect &amp; Redact
                </button>
                <button id="pg-dismiss-btn" style="background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">
                    Dismiss
                </button>
            </div>
        `;

        floatingRoot.appendChild(floatingPanel);
        floatingRoot.appendChild(floatingBadge);
        document.body.appendChild(floatingRoot);

        // Toggle panel on pill click
        floatingBadge.addEventListener("click", () => {
            const isVisible = floatingPanel.style.display === "block";
            floatingPanel.style.display = isVisible ? "none" : "block";
            if (!isVisible) updatePanelDetails();
        });

        // Close handlers
        floatingPanel.querySelector("#pg-panel-close").addEventListener("click", (e) => {
            e.stopPropagation();
            floatingPanel.style.display = "none";
        });
        floatingPanel.querySelector("#pg-dismiss-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            floatingPanel.style.display = "none";
        });

        // Redaction execution
        floatingPanel.querySelector("#pg-redact-now-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            executeFormProtection();
        });
    }

    // ========================================================================
    // 3. BADGE & FLYOUT UI UPDATER
    // ========================================================================
    function updateBadgeDisplay(count, score, level) {
        createFloatingUI();
        if (!floatingBadge) return;

        const label = document.getElementById("pg-badge-label");
        if (count > 0) {
            floatingBadge.style.borderColor = level === "HIGH" ? "#ef4444" : "#f59e0b";
            floatingBadge.style.boxShadow = level === "HIGH"
                ? "0 8px 30px rgba(239, 68, 68, 0.5), 0 0 12px rgba(239, 68, 68, 0.4)"
                : "0 8px 30px rgba(245, 158, 11, 0.5)";
            label.innerHTML = `<span style="color:${level === 'HIGH' ? '#f87171' : '#fbbf24'}; font-weight:700;">${count} Sensitive Item${count === 1 ? '' : 's'} (${score}/100 Risk)</span>`;
        } else {
            floatingBadge.style.borderColor = "rgba(99, 102, 241, 0.4)";
            floatingBadge.style.boxShadow = "0 8px 28px rgba(0, 0, 0, 0.45)";
            label.textContent = "PrivacyGuard Active";
        }

        try {
            chrome.runtime.sendMessage({
                type: "UPDATE_BADGE",
                count: count,
                riskScore: score
            });
        } catch (e) {}
    }

    function updatePanelDetails() {
        if (!floatingPanel) return;
        const statusEl = document.getElementById("pg-panel-status");
        const listEl = document.getElementById("pg-detected-list");

        if (currentDetected.length === 0) {
            statusEl.innerHTML = `<span style="color:#10b981; font-weight:600;">✓ No sensitive PII detected in active forms.</span>`;
            listEl.innerHTML = `<div style="color:#94a3b8; font-size:11.5px; padding: 8px 0;">All inputs and forms are clean.</div>`;
            return;
        }

        statusEl.innerHTML = `Found <strong style="color:#f87171;">${currentDetected.length} personal identifiers</strong> with an exposure risk of <strong style="color:#f87171;">${currentRisk.score}/100 (${currentRisk.level})</strong>:`;

        listEl.innerHTML = currentDetected.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:6px 10px; border-radius:6px; margin-bottom:6px; border:1px solid rgba(255,255,255,0.06);">
                <div>
                    <span style="font-weight:600; color:#f8fafc; font-size:11.5px;">${item.label}</span>
                    <div style="font-family:monospace; color:#94a3b8; font-size:11px;">${item.value}</div>
                </div>
                <span style="font-size:10px; font-weight:700; color:${item.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}; background:rgba(239,68,68,0.15); padding:2px 6px; border-radius:4px;">
                    ${item.severity}
                </span>
            </div>
        `).join("");
    }

    // ========================================================================
    // 4. IN-PLACE FORM PROTECTION & REDACTION
    // ========================================================================
    function executeFormProtection() {
        let targetEl = activeInputTarget;
        if (!targetEl || isIgnoredElement(targetEl)) {
            const candidates = document.querySelectorAll("textarea, input[type='text'], [contenteditable='true']");
            for (const el of candidates) {
                if (isIgnoredElement(el)) continue;
                const val = el.value || el.innerText || "";
                if (localDetectPII(val).length > 0) {
                    targetEl = el;
                    break;
                }
            }
        }

        if (!targetEl) {
            alert("No input field with sensitive data detected.");
            return;
        }

        const rawText = targetEl.value !== undefined ? targetEl.value : (targetEl.innerText || "");
        const purposeSelect = document.getElementById("pg-purpose-select");
        const purpose = purposeSelect ? purposeSelect.value : "expense_reimbursement";

        const { protectedText, exposureReduction } = localRedact(rawText, currentDetected, purpose);

        if (targetEl.value !== undefined) {
            targetEl.value = protectedText;
            targetEl.dispatchEvent(new Event("input", { bubbles: true }));
            targetEl.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (targetEl.isContentEditable) {
            targetEl.innerText = protectedText;
            targetEl.dispatchEvent(new Event("input", { bubbles: true }));
        }

        currentDetected = localDetectPII(protectedText);
        currentRisk = calculateLocalRisk(currentDetected);
        updateBadgeDisplay(currentDetected.length, currentRisk.score, currentRisk.level);
        updatePanelDetails();

        const btn = document.getElementById("pg-redact-now-btn");
        if (btn) {
            btn.textContent = `✓ Protected (${exposureReduction}% Redacted)`;
            btn.style.background = "#10b981";
            setTimeout(() => {
                btn.textContent = "🛡️ Protect & Redact";
                btn.style.background = "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)";
                if (floatingPanel) floatingPanel.style.display = "none";
            }, 1800);
        }
    }

    // ========================================================================
    // 5. LIVE CONTINUOUS FORM MONITORING
    // ========================================================================
    let scanDebounceTimer = null;

    function evaluateText(text, sourceElement = null) {
        if (sourceElement && isIgnoredElement(sourceElement)) return;
        if (sourceElement) activeInputTarget = sourceElement;

        const detected = localDetectPII(text);
        const risk = calculateLocalRisk(detected);

        currentDetected = detected;
        currentRisk = risk;

        updateBadgeDisplay(detected.length, risk.score, risk.level);
        if (floatingPanel && floatingPanel.style.display === "block") {
            updatePanelDetails();
        }
    }

    function checkActiveForms() {
        const inputs = document.querySelectorAll("textarea, input[type='text'], input:not([type]), [contenteditable='true']");
        let combinedText = "";

        inputs.forEach(el => {
            if (isIgnoredElement(el)) return;
            const val = el.value !== undefined ? el.value : (el.innerText || "");
            if (val.trim()) {
                const itemHits = localDetectPII(val);
                if (itemHits.length > 0) {
                    activeInputTarget = el;
                    combinedText += (combinedText ? "\n" : "") + val;
                }
            }
        });

        if (combinedText) {
            evaluateText(combinedText, activeInputTarget);
        } else {
            currentDetected = [];
            currentRisk = { score: 0, level: "LOW" };
            updateBadgeDisplay(0, 0, "LOW");
        }
    }

    function attachInputListeners(el) {
        if (!el || isIgnoredElement(el) || monitoredElements.has(el)) return;
        monitoredElements.add(el);

        const handleInput = () => {
            clearTimeout(scanDebounceTimer);
            scanDebounceTimer = setTimeout(() => {
                if (isIgnoredElement(el)) return;
                const text = el.value !== undefined ? el.value : (el.innerText || "");
                evaluateText(text, el);
            }, 120);
        };

        el.addEventListener("input", handleInput);
        el.addEventListener("keyup", handleInput);
        el.addEventListener("paste", () => setTimeout(handleInput, 50));
        el.addEventListener("change", handleInput);
        el.addEventListener("focus", () => {
            if (isIgnoredElement(el)) return;
            activeInputTarget = el;
            const text = el.value !== undefined ? el.value : (el.innerText || "");
            if (text) evaluateText(text, el);
        });
    }

    function observePageMutations() {
        const initialInputs = document.querySelectorAll("textarea, input[type='text'], input:not([type]), [contenteditable='true']");
        initialInputs.forEach(attachInputListeners);
        checkActiveForms();

        const observer = new MutationObserver((mutations) => {
            let foundNew = false;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (isIgnoredElement(node)) continue;
                        if (node.matches && node.matches("textarea, input[type='text'], [contenteditable='true']")) {
                            attachInputListeners(node);
                            foundNew = true;
                        } else if (node.querySelectorAll) {
                            const children = node.querySelectorAll("textarea, input[type='text'], [contenteditable='true']");
                            children.forEach(c => {
                                if (!isIgnoredElement(c)) {
                                    attachInputListeners(c);
                                    foundNew = true;
                                }
                            });
                        }
                    }
                }
            }
            if (foundNew) checkActiveForms();
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // ========================================================================
    // 6. FORM SUBMISSION SAFETY INTERCEPTOR
    // ========================================================================
    function setupSubmitInterceptor() {
        document.addEventListener("click", (e) => {
            // NEVER intercept inside PrivacyGuard auth modal or internal UI
            if (e.target.closest && (
                e.target.closest("#pgAuthOverlay") ||
                e.target.closest(".pg-auth-card") ||
                e.target.closest("#privacyguard-live-root")
            )) {
                return;
            }

            const btn = e.target.closest("button, input[type='submit'], .btn-send");
            if (!btn) return;

            // Only intercept third-party form submissions when real user forms hold high-risk PII
            if (currentDetected && currentDetected.length > 0 && currentRisk.score >= 40) {
                const hasHighRisk = currentDetected.some(i => i.severity === "HIGH");
                if (hasHighRisk) {
                    e.preventDefault();
                    e.stopPropagation();

                    createFloatingUI();
                    floatingPanel.style.display = "block";
                    updatePanelDetails();

                    const alertDiv = document.getElementById("pg-panel-status");
                    if (alertDiv) {
                        alertDiv.innerHTML = `
                            <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 8px; padding: 8px; color: #fca5a5; margin-bottom: 8px;">
                                <strong>⚠️ Data Leak Warning:</strong> Unredacted personal credentials detected! Click <strong>Protect &amp; Redact</strong> before submitting.
                            </div>
                        `;
                    }
                }
            }
        }, true);
    }

    // ========================================================================
    // 7. BACKGROUND & POPUP COMMUNICATION
    // ========================================================================
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PAGE_TEXT") {
            let text = "";
            if (activeInputTarget && !isIgnoredElement(activeInputTarget)) {
                text = activeInputTarget.value !== undefined ? activeInputTarget.value : (activeInputTarget.innerText || "");
            }
            if (!text || !text.trim()) {
                const textareas = Array.from(document.querySelectorAll("textarea, [contenteditable='true']"));
                for (const ta of textareas) {
                    if (isIgnoredElement(ta)) continue;
                    const val = ta.value !== undefined ? ta.value : (ta.innerText || "");
                    if (val.trim().length > text.trim().length) {
                        text = val;
                        activeInputTarget = ta;
                    }
                }
            }
            if (!text || !text.trim()) {
                const sel = window.getSelection().toString();
                text = sel || document.body.innerText.slice(0, 3000);
            }
            sendResponse({ success: true, text: text });
            return false;
        }

        if (message.type === "REPLACE_PAGE_TEXT") {
            if (activeInputTarget && message.protectedText && !isIgnoredElement(activeInputTarget)) {
                if (activeInputTarget.value !== undefined) {
                    activeInputTarget.value = message.protectedText;
                    activeInputTarget.dispatchEvent(new Event("input", { bubbles: true }));
                    activeInputTarget.dispatchEvent(new Event("change", { bubbles: true }));
                } else if (activeInputTarget.isContentEditable) {
                    activeInputTarget.innerText = message.protectedText;
                }
                evaluateText(message.protectedText, activeInputTarget);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, reason: "No active target" });
            }
            return false;
        }
    });

    // ========================================================================
    // 8. AUTO-INITIALIZATION
    // ========================================================================
    function init() {
        createFloatingUI();
        observePageMutations();
        setupSubmitInterceptor();
        setTimeout(checkActiveForms, 300);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
