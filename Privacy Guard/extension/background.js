/**
 * PrivacyGuard — Background Service Worker (Manifest V3)
 * Central coordinator for deterministic privacy scanning, purpose analysis,
 * and text protection via the local FastAPI backend (http://127.0.0.1:8000).
 *
 * ZERO external cloud AI calls.
 * ZERO raw PII logging.
 */

const BACKEND_BASE = 'http://127.0.0.1:8000';
const tabScanCache = new Map();

// Helper for fetch with timeout
async function fetchWithTimeout(resource, options = {}, timeoutMs = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

// 1. Health check
async function checkBackendHealth() {
    try {
        const resp = await fetchWithTimeout(`${BACKEND_BASE}/api/stats`, { method: 'GET' }, 2500);
        if (resp.ok) {
            const data = await resp.json();
            return { online: true, stats: data.stats || null };
        }
        return { online: false, error: 'Backend returned non-200 status' };
    } catch (err) {
        return {
            online: false,
            error: 'PrivacyGuard backend is offline. Start the local PrivacyGuard server at http://127.0.0.1:8000.'
        };
    }
}

// 2. Scan Text via Backend
async function scanText(text, tabId = null) {
    if (!text || typeof text !== 'string' || !text.trim()) {
        return { success: true, total_detected: 0, detected: [], risk: { score: 0, level: 'LOW' } };
    }

    try {
        const resp = await fetchWithTimeout(`${BACKEND_BASE}/api/scan/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }, 5000);

        if (!resp.ok) {
            return { success: false, error: `Scan failed with status ${resp.status}` };
        }

        const data = await resp.json();
        
        // Cache for popup retrieval
        if (tabId) {
            tabScanCache.set(tabId, {
                scannedAt: Date.now(),
                textSnippet: text.slice(0, 100),
                data: data
            });
            updateBadge(tabId, data.total_detected || 0, data.risk ? data.risk.score : 0);
        }

        return { success: true, ...data };
    } catch (err) {
        return {
            success: false,
            offline: true,
            error: 'PrivacyGuard backend is offline. Start the local PrivacyGuard server at http://127.0.0.1:8000.'
        };
    }
}

// 3. Analyze Purpose via Backend
async function analyzePurpose(purpose, detected) {
    try {
        const resp = await fetchWithTimeout(`${BACKEND_BASE}/api/analyze/purpose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purpose, detected })
        }, 4000);

        if (!resp.ok) {
            return { success: false, error: `Purpose analysis failed with status ${resp.status}` };
        }

        const data = await resp.json();
        return { success: true, ...data };
    } catch (err) {
        return {
            success: false,
            offline: true,
            error: 'PrivacyGuard backend is offline. Start the local PrivacyGuard server at http://127.0.0.1:8000.'
        };
    }
}

// 4. Protect Text via Backend
async function protectText(text, detected, decisions, purpose = null) {
    try {
        const resp = await fetchWithTimeout(`${BACKEND_BASE}/api/protect/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                detected,
                decisions,
                purpose
            })
        }, 6000);

        if (!resp.ok) {
            return { success: false, error: `Protection failed with status ${resp.status}` };
        }

        const data = await resp.json();
        return { success: true, ...data };
    } catch (err) {
        return {
            success: false,
            offline: true,
            error: 'PrivacyGuard backend is offline. Start the local PrivacyGuard server at http://127.0.0.1:8000.'
        };
    }
}

// Update Action Badge
function updateBadge(tabId, count, riskScore) {
    try {
        if (!tabId || tabId < 0) return;
        if (count > 0) {
            chrome.action.setBadgeText({ text: String(count), tabId });
            const bgColor = riskScore >= 70 ? '#ef4444' : (riskScore >= 40 ? '#f59e0b' : '#3b82f6');
            chrome.action.setBadgeBackgroundColor({ color: bgColor, tabId });
        } else {
            chrome.action.setBadgeText({ text: '', tabId });
        }
    } catch (e) {
        // Tab might be closed or invalid
    }
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab ? sender.tab.id : message.tabId;

    switch (message.type) {
        case 'CHECK_HEALTH':
            checkBackendHealth().then(sendResponse);
            return true;

        case 'SCAN_TEXT':
            scanText(message.text, tabId).then(sendResponse);
            return true;

        case 'ANALYZE_PURPOSE':
            analyzePurpose(message.purpose, message.detected).then(sendResponse);
            return true;

        case 'PROTECT_TEXT':
            protectText(message.text, message.detected, message.decisions, message.purpose).then(sendResponse);
            return true;

        case 'GET_TAB_SCAN':
            sendResponse(tabScanCache.get(tabId) || null);
            return false;

        case 'UPDATE_BADGE':
            updateBadge(tabId, message.count, message.riskScore);
            sendResponse({ success: true });
            return false;

        case 'CLEAR_BADGE':
            if (tabId) {
                chrome.action.setBadgeText({ text: '', tabId });
                tabScanCache.delete(tabId);
            }
            sendResponse({ success: true });
            return false;

        default:
            sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
            return false;
    }
});

// Clean up closed tabs from cache
chrome.tabs.onRemoved.addListener((tabId) => {
    tabScanCache.delete(tabId);
});
