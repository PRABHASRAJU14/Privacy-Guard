/**
 * PrivacyGuard — Popup Controller (Manifest V3)
 * Orchestrates deterministic privacy scanning, purpose-aware minimization,
 * and text protection via background service worker.
 */

const UBER_SAMPLE = `Merchant: Uber India
Amount: ₹2,850
Date: 05 Sep 2026
Transaction ID: TXN84927361
Bank Account: 4821 0098 7712
UPI ID: rahul@bank
Available Balance: ₹74,820

Other Transactions:
Amazon -₹4,299
Swiggy -₹620
Electricity -₹2,140`;

let currentScanResult = null;
let currentPurposeResult = null;
let currentScannedText = "";

document.addEventListener("DOMContentLoaded", async () => {
    initHealthCheck();
    initEventListeners();
    await checkAutoScan();
});

// Toast notification helper
function showToast(msg) {
    const toast = document.getElementById("popupToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 2800);
}

// 1. Check backend health
async function initHealthCheck() {
    const pill = document.getElementById("backendStatusPill");
    const dot = document.getElementById("backendStatusDot");
    const text = document.getElementById("backendStatusText");
    const offlineBanner = document.getElementById("offlineBanner");

    try {
        const resp = await chrome.runtime.sendMessage({ type: "CHECK_HEALTH" });
        if (resp && resp.online) {
            pill.className = "status-pill online";
            text.textContent = "Local Engine Online";
            offlineBanner.style.display = "none";
        } else {
            pill.className = "status-pill offline";
            text.textContent = "Backend Offline";
            offlineBanner.style.display = "flex";
        }
    } catch (e) {
        pill.className = "status-pill offline";
        text.textContent = "Backend Offline";
        offlineBanner.style.display = "flex";
    }
}

// 2. Initialize Event Listeners
function initEventListeners() {
    const scanBtn = document.getElementById("scanPageBtn");
    const retryBtn = document.getElementById("retryBackendBtn");
    const purposeSelect = document.getElementById("purposeSelect");
    const protectBtn = document.getElementById("applyProtectBtn");
    const copyBtn = document.getElementById("copySafeTextBtn");
    const replaceBtn = document.getElementById("replaceOnPageBtn");
    const loadSampleBtn = document.getElementById("loadSampleBtn");

    if (scanBtn) {
        scanBtn.addEventListener("click", () => scanActivePage());
    }

    if (retryBtn) {
        retryBtn.addEventListener("click", async () => {
            showToast("Connecting to local engine...");
            await initHealthCheck();
        });
    }

    if (purposeSelect) {
        purposeSelect.addEventListener("change", () => {
            if (currentScanResult && currentScanResult.detected) {
                runPurposeAnalysis(purposeSelect.value, currentScanResult.detected);
            }
        });
    }

    if (protectBtn) {
        protectBtn.addEventListener("click", () => executeProtection());
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const preview = document.getElementById("protectedTextPreview");
            if (preview && preview.value) {
                navigator.clipboard.writeText(preview.value).then(() => {
                    showToast("✓ Safe text copied to clipboard");
                });
            }
        });
    }

    if (replaceBtn) {
        replaceBtn.addEventListener("click", () => replaceOnActivePage());
    }

    if (loadSampleBtn) {
        loadSampleBtn.addEventListener("click", () => {
            currentScannedText = UBER_SAMPLE;
            executeScanOnText(UBER_SAMPLE);
        });
    }
}

// 3. Auto-load cached scan for active tab if available
async function checkAutoScan() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            const cached = await chrome.runtime.sendMessage({ type: "GET_TAB_SCAN", tabId: tab.id });
            if (cached && cached.data) {
                renderScanResults(cached.data);
            }
        }
    } catch (e) {
        // Tab not accessible
    }
}

// 4. Scan Active Page
async function scanActivePage() {
    const loader = document.getElementById("scanLoading");
    const emptyState = document.getElementById("emptyState");
    const resultsSection = document.getElementById("resultsSection");
    const protectedSection = document.getElementById("protectedSection");

    loader.style.display = "flex";
    emptyState.style.display = "none";
    resultsSection.style.display = "none";
    protectedSection.style.display = "none";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            throw new Error("No active browser tab found.");
        }

        // Try getting text from content script
        let pageText = "";
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_TEXT" });
            if (response && response.text) {
                pageText = response.text;
            }
        } catch (csError) {
            // Content script may not be injected yet or restricted page
        }

        if (!pageText || pageText.trim().length === 0) {
            // If page is empty or restricted, fallback to sample for effortless demo
            pageText = UBER_SAMPLE;
            showToast("Demo mode: loaded Uber expense receipt sample");
        }

        currentScannedText = pageText;
        await executeScanOnText(pageText, tab.id);
    } catch (err) {
        loader.style.display = "none";
        emptyState.style.display = "flex";
        showToast(`Scan notice: ${err.message || "Unable to inspect page"}`);
    }
}

// 5. Execute Scan on text
async function executeScanOnText(text, tabId = null) {
    const loader = document.getElementById("scanLoading");
    loader.style.display = "flex";

    try {
        const resp = await chrome.runtime.sendMessage({
            type: "SCAN_TEXT",
            text: text,
            tabId: tabId
        });

        loader.style.display = "none";

        if (!resp || !resp.success) {
            if (resp && resp.offline) {
                document.getElementById("offlineBanner").style.display = "flex";
                showToast("Backend offline. Please start http://127.0.0.1:8000");
            } else {
                showToast(resp ? resp.error : "Scan failed");
            }
            document.getElementById("emptyState").style.display = "flex";
            return;
        }

        currentScanResult = resp;
        renderScanResults(resp);

        // Run default purpose analysis (Expense Reimbursement)
        const purposeSelect = document.getElementById("purposeSelect");
        const purpose = purposeSelect ? purposeSelect.value : "expense_reimbursement";
        await runPurposeAnalysis(purpose, resp.detected || []);
    } catch (err) {
        loader.style.display = "none";
        document.getElementById("emptyState").style.display = "flex";
        showToast("Error connecting to background service.");
    }
}

// 6. Render Scan Results
function renderScanResults(data) {
    const resultsSection = document.getElementById("resultsSection");
    const emptyState = document.getElementById("emptyState");
    const riskScoreText = document.getElementById("riskScoreText");
    const riskBadge = document.getElementById("riskBadge");
    const countLabel = document.getElementById("detectedCountLabel");

    emptyState.style.display = "none";
    resultsSection.style.display = "block";

    const score = (data.risk && typeof data.risk.score === "number") ? data.risk.score : 0;
    const level = (data.risk && data.risk.level) ? data.risk.level : "LOW";
    const total = data.total_detected || (data.detected ? data.detected.length : 0);

    riskScoreText.textContent = `${score} / 100`;
    riskBadge.textContent = `${level} RISK`;
    countLabel.textContent = `${total} sensitive item${total === 1 ? "" : "s"} detected on page`;

    if (score >= 70) {
        riskBadge.style.background = "rgba(239, 68, 68, 0.2)";
        riskBadge.style.color = "#fca5a5";
        riskScoreText.style.color = "#f87171";
    } else if (score >= 35) {
        riskBadge.style.background = "rgba(245, 158, 11, 0.2)";
        riskBadge.style.color = "#fde68a";
        riskScoreText.style.color = "#fbbf24";
    } else {
        riskBadge.style.background = "rgba(34, 197, 94, 0.2)";
        riskBadge.style.color = "#86efac";
        riskScoreText.style.color = "#4ade80";
    }
}

// 7. Purpose Analysis (KEEP vs PROTECT breakdown)
async function runPurposeAnalysis(purpose, detected) {
    const keepTags = document.getElementById("keepTags");
    const protectTags = document.getElementById("protectTags");
    keepTags.innerHTML = "<span style='font-size:11px;color:#94a3b8;'>Calculating policy...</span>";
    protectTags.innerHTML = "<span style='font-size:11px;color:#94a3b8;'>Calculating policy...</span>";

    try {
        const resp = await chrome.runtime.sendMessage({
            type: "ANALYZE_PURPOSE",
            purpose: purpose,
            detected: detected
        });

        if (!resp || !resp.success) {
            keepTags.innerHTML = "<span class='tag-item keep'>Merchant, Amount</span>";
            protectTags.innerHTML = "<span class='tag-item protect'>Bank, UPI, Balance</span>";
            return;
        }

        currentPurposeResult = resp;

        keepTags.innerHTML = "";
        if (resp.keep && resp.keep.length > 0) {
            resp.keep.forEach(k => {
                const el = document.createElement("span");
                el.className = "tag-item keep";
                el.textContent = `✓ ${k}`;
                keepTags.appendChild(el);
            });
        } else {
            keepTags.innerHTML = "<span style='font-size:11px;color:#64748b;'>None</span>";
        }

        protectTags.innerHTML = "";
        if (resp.protect && resp.protect.length > 0) {
            resp.protect.forEach(p => {
                const el = document.createElement("span");
                el.className = "tag-item protect";
                el.textContent = `🔒 ${p}`;
                protectTags.appendChild(el);
            });
        } else {
            protectTags.innerHTML = "<span style='font-size:11px;color:#64748b;'>None</span>";
        }
    } catch (e) {
        keepTags.innerHTML = "<span class='tag-item keep'>✓ Required fields</span>";
        protectTags.innerHTML = "<span class='tag-item protect'>🔒 Sensitive fields</span>";
    }
}

// 8. Execute Protection
async function executeProtection() {
    if (!currentScanResult || !currentScanResult.detected) {
        showToast("No scanned data available to protect.");
        return;
    }

    const purposeSelect = document.getElementById("purposeSelect");
    const purpose = purposeSelect ? purposeSelect.value : "expense_reimbursement";

    const decisions = {};
    if (currentPurposeResult && currentPurposeResult.recommendations) {
        currentPurposeResult.recommendations.forEach(r => {
            decisions[r.type] = r.decision;
        });
    }

    showToast("Applying purpose-aware redaction...");

    try {
        const resp = await chrome.runtime.sendMessage({
            type: "PROTECT_TEXT",
            text: currentScannedText,
            detected: currentScanResult.detected,
            decisions: decisions,
            purpose: purpose
        });

        if (!resp || !resp.success) {
            showToast("Protection error: " + (resp ? resp.error : "Unknown error"));
            return;
        }

        const protectedSection = document.getElementById("protectedSection");
        const preview = document.getElementById("protectedTextPreview");
        const reductionPill = document.getElementById("exposureReductionPill");
        const receiptCode = document.getElementById("receiptHashShort");

        protectedSection.style.display = "flex";
        preview.value = resp.protected_text || "";

        if (resp.exposure_reduction != null) {
            reductionPill.textContent = `-${Math.round(resp.exposure_reduction)}% Exposure`;
        }

        if (resp.protection_receipt && resp.protection_receipt.hash) {
            const h = resp.protection_receipt.hash;
            receiptCode.textContent = `${h.slice(0, 16)}...`;
            receiptCode.title = `SHA-256: ${h}`;
        }

        showToast("🛡️ Protected! Ready to copy or replace.");
    } catch (e) {
        showToast("Error communicating with protection engine.");
    }
}

// 9. Replace text on active webpage
async function replaceOnActivePage() {
    const preview = document.getElementById("protectedTextPreview");
    if (!preview || !preview.value) {
        showToast("No protected text available to insert.");
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            throw new Error("No active tab.");
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            type: "REPLACE_PAGE_TEXT",
            protectedText: preview.value
        });

        if (response && response.success) {
            showToast("⚡ Webpage text safely updated!");
        } else {
            showToast("Copied to clipboard (no active form field found on page)");
            navigator.clipboard.writeText(preview.value);
        }
    } catch (err) {
        showToast("Copied to clipboard (target page is restricted)");
        navigator.clipboard.writeText(preview.value);
    }
}
