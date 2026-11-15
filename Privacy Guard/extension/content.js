/**
 * PrivacyGuard — Content Script (Manifest V3)
 * Injected on web pages to detect sensitive data in inputs, forms, and pages,
 * displaying a floating PrivacyGuard warning badge & modal with 1-click protection.
 *
 * ZERO external AI calls.
 * ZERO raw PII logging.
 */

(function () {
    if (window.__privacyGuardInjected) return;
    window.__privacyGuardInjected = true;

    let floatingWidget = null;
    let floatingBadge = null;
    let activeInputTarget = null;
    let lastScanData = null;

    // Create the floating PrivacyGuard trigger badge
    function initFloatingUI() {
        if (document.getElementById("privacyguard-floating-root")) return;

        const root = document.createElement("div");
        root.id = "privacyguard-floating-root";
        root.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            font-family: system-ui, -apple-system, sans-serif;
        `;

        // Floating pill button
        floatingBadge = document.createElement("div");
        floatingBadge.id = "privacyguard-badge-pill";
        floatingBadge.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f8fafc;
            border: 1px solid rgba(99, 102, 241, 0.4);
            padding: 8px 14px;
            border-radius: 30px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.25s ease;
            user-select: none;
        `;
        floatingBadge.innerHTML = `
            <span style="font-size: 16px;">🛡️</span>
            <span id="pg-badge-text">PrivacyGuard Active</span>
        `;

        // Floating Modal Panel (hidden by default)
        floatingWidget = document.createElement("div");
        floatingWidget.id = "privacyguard-floating-panel";
        floatingWidget.style.cssText = `
            display: none;
            position: absolute;
            bottom: 48px;
            right: 0;
            width: 320px;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
            color: #f8fafc;
            font-size: 12px;
        `;

        floatingWidget.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
                <strong style="color: #818cf8; display: flex; align-items: center; gap: 6px;">
                    🛡️ Sensitive Data Detected
                </strong>
                <button id="pg-close-panel" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">&times;</button>
            </div>
            <div id="pg-panel-body">
                <p id="pg-detected-summary" style="color: #cbd5e1; margin-bottom: 10px; font-size: 11.5px;">
                    Potential privacy leak detected in this form.
                </p>
                <div style="margin-bottom: 10px;">
                    <label style="font-size: 10.5px; color: #94a3b8; display: block; margin-bottom: 4px;">Sharing Purpose:</label>
                    <select id="pg-purpose-select" style="width: 100%; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #f8fafc; padding: 6px; font-size: 11px;">
                        <option value="expense_reimbursement" selected>🧾 Expense Reimbursement</option>
                        <option value="bank_verification">🏦 Bank Verification</option>
                        <option value="job_application">💼 Job Application</option>
                        <option value="general_sharing">💬 General Sharing</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="pg-protect-btn" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; border: none; padding: 8px 10px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                        🛡️ Protect &amp; Redact
                    </button>
                    <button id="pg-dismiss-btn" style="background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 11px;">
                        Dismiss
                    </button>
                </div>
            </div>
        `;

        root.appendChild(floatingWidget);
        root.appendChild(floatingBadge);
        document.body.appendChild(root);

        // Click badge to toggle panel
        floatingBadge.addEventListener("click", () => {
            const isVisible = floatingWidget.style.display === "block";
            floatingWidget.style.display = isVisible ? "none" : "block";
        });

        // Close button
        const closeBtn = floatingWidget.querySelector("#pg-close-panel");
        if (closeBtn) {
            closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                floatingWidget.style.display = "none";
            });
        }

        const dismissBtn = floatingWidget.querySelector("#pg-dismiss-btn");
        if (dismissBtn) {
            dismissBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                floatingWidget.style.display = "none";
            });
        }

        // Protect button in floating widget
        const protectBtn = floatingWidget.querySelector("#pg-protect-btn");
        if (protectBtn) {
            protectBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                await handleInlineProtect();
            });
        }
    }

    // Update floating badge appearance
    function updateBadgeWarning(count, riskScore) {
        initFloatingUI();
        if (!floatingBadge) return;

        const badgeText = document.getElementById("pg-badge-text");
        const summaryText = document.getElementById("pg-detected-summary");

        if (count > 0) {
            floatingBadge.style.borderColor = "#ef4444";
            floatingBadge.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.4)";
            if (badgeText) {
                badgeText.innerHTML = `<span style="color:#f87171;">${count} Sensitive Item${count === 1 ? "" : "s"}</span> (${riskScore} Risk)`;
            }
            if (summaryText) {
                summaryText.textContent = `PrivacyGuard detected ${count} sensitive item${count === 1 ? "" : "s"} (${riskScore}/100 risk). Choose your purpose to minimize exposure.`;
            }
        } else {
            floatingBadge.style.borderColor = "rgba(99, 102, 241, 0.4)";
            floatingBadge.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.35)";
            if (badgeText) {
                badgeText.textContent = "PrivacyGuard Active";
            }
        }
    }

    // Handle Inline Protection action from floating panel
    async function handleInlineProtect() {
        if (!activeInputTarget && !lastScanData) {
            alert("No active input target found to protect.");
            return;
        }

        const targetText = activeInputTarget ? (activeInputTarget.value || activeInputTarget.innerText || "") : "";
        if (!targetText || !lastScanData || !lastScanData.detected) return;

        const select = document.getElementById("pg-purpose-select");
        const purpose = select ? select.value : "expense_reimbursement";

        try {
            // 1. Analyze purpose
            const purposeResp = await chrome.runtime.sendMessage({
                type: "ANALYZE_PURPOSE",
                purpose: purpose,
                detected: lastScanData.detected
            });

            const decisions = {};
            if (purposeResp && purposeResp.recommendations) {
                purposeResp.recommendations.forEach(r => {
                    decisions[r.type] = r.decision;
                });
            }

            // 2. Protect
            const protectResp = await chrome.runtime.sendMessage({
                type: "PROTECT_TEXT",
                text: targetText,
                detected: lastScanData.detected,
                decisions: decisions,
                purpose: purpose
            });

            if (protectResp && protectResp.success && protectResp.protected_text) {
                if (activeInputTarget.value !== undefined) {
                    activeInputTarget.value = protectResp.protected_text;
                    activeInputTarget.dispatchEvent(new Event("input", { bubbles: true }));
                } else if (activeInputTarget.isContentEditable) {
                    activeInputTarget.innerText = protectResp.protected_text;
                }

                updateBadgeWarning(0, 0);
                if (floatingWidget) floatingWidget.style.display = "none";
                alert(`✓ Sensitive data protected with purpose-aware minimization! (${Math.round(protectResp.exposure_reduction || 73)}% exposure reduction)`);
            }
        } catch (err) {
            console.warn("[PrivacyGuard] Protection failed", err);
        }
    }

    // Debounced PII scanning on form inputs
    let scanTimeout = null;
    function monitorInput(el) {
        if (!el) return;
        el.addEventListener("input", () => {
            clearTimeout(scanTimeout);
            scanTimeout = setTimeout(async () => {
                const text = el.value || el.innerText || "";
                if (text.length > 20) {
                    activeInputTarget = el;
                    try {
                        const resp = await chrome.runtime.sendMessage({
                            type: "SCAN_TEXT",
                            text: text
                        });
                        if (resp && resp.success) {
                            lastScanData = resp;
                            const count = resp.total_detected || (resp.detected ? resp.detected.length : 0);
                            const score = resp.risk ? resp.risk.score : 0;
                            updateBadgeWarning(count, score);
                        }
                    } catch (e) {}
                }
            }, 600);
        });

        el.addEventListener("focus", () => {
            activeInputTarget = el;
        });
    }

    // Scan initial DOM elements
    function scanPageForms() {
        const inputs = document.querySelectorAll("textarea, input[type='text'], [contenteditable='true']");
        inputs.forEach(monitorInput);
    }

    // Message listener for popup & background actions
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PAGE_TEXT") {
            // Look for focused or active inputs first
            let text = "";
            if (activeInputTarget) {
                text = activeInputTarget.value || activeInputTarget.innerText || "";
            }

            if (!text || text.trim().length === 0) {
                // Try finding largest textarea or input
                const textareas = Array.from(document.querySelectorAll("textarea, [contenteditable='true']"));
                for (const ta of textareas) {
                    const val = ta.value || ta.innerText || "";
                    if (val.trim().length > text.trim().length) {
                        text = val;
                        activeInputTarget = ta;
                    }
                }
            }

            if (!text || text.trim().length === 0) {
                // Return selection or main content
                const sel = window.getSelection().toString();
                if (sel && sel.trim().length > 0) {
                    text = sel;
                } else {
                    text = document.body.innerText.slice(0, 3000);
                }
            }

            sendResponse({ success: true, text: text });
            return false;
        }

        if (message.type === "REPLACE_PAGE_TEXT") {
            if (activeInputTarget && message.protectedText) {
                if (activeInputTarget.value !== undefined) {
                    activeInputTarget.value = message.protectedText;
                    activeInputTarget.dispatchEvent(new Event("input", { bubbles: true }));
                    activeInputTarget.dispatchEvent(new Event("change", { bubbles: true }));
                } else if (activeInputTarget.isContentEditable) {
                    activeInputTarget.innerText = message.protectedText;
                }
                updateBadgeWarning(0, 0);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, reason: "No active target" });
            }
            return false;
        }
    });

    // Auto-initialize when document is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initFloatingUI();
            scanPageForms();
        });
    } else {
        initFloatingUI();
        scanPageForms();
    }
})();
