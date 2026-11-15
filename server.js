/**
 * PrivacyGuard — Universal Local Engine Server (Node.js)
 * High-performance, zero-dependency local server.
 * Serves the web app, browser extension, and provides local PII scanning & protection APIs.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "127.0.0.1";
const BASE_DIR = __dirname;
const FRONTEND_DIR = path.join(BASE_DIR, "Privacy Guard");
const EXTENSION_DIR = path.join(BASE_DIR, "extension");

// MIME Types
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".md": "text/markdown; charset=utf-8",
};

// CORS Headers helper
function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Deterministic PII Detection in JS
function detectPII(text) {
    if (!text || typeof text !== "string") return [];
    const items = [];

    // 1. Aadhaar
    const aadhaarRegex = /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g;
    let m;
    while ((m = aadhaarRegex.exec(text)) !== null) {
        items.push({
            type: "aadhaar",
            label: "Aadhaar Number",
            value: m[0],
            category: "identity",
            severity: "HIGH",
            risk_weight: 35,
            start: m.index,
            end: m.index + m[0].length,
            valid: true,
            explanation: "12-digit Indian national identity identifier."
        });
    }

    // 2. PAN Card
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
            end: m.index + m[0].length,
            valid: true,
            explanation: "Permanent Account Number issued by Income Tax Dept."
        });
    }

    // 3. Payment Card (16 digits)
    const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
    while ((m = cardRegex.exec(text)) !== null) {
        // avoid overlap with aadhaar
        if (!items.some(i => i.type === "aadhaar" && i.start === m.index)) {
            items.push({
                type: "card",
                label: "Credit / Debit Card",
                value: m[0],
                category: "financial",
                severity: "HIGH",
                risk_weight: 35,
                start: m.index,
                end: m.index + m[0].length,
                valid: true,
                explanation: "16-digit payment card number."
            });
        }
    }

    // 4. UPI ID
    const upiRegex = /\b[a-zA-Z0-9.\-_]{2,64}@(?!bank\b|company\b|example\b)[a-zA-Z0-9.\-_]{2,32}\b/g;
    while ((m = upiRegex.exec(text)) !== null) {
        items.push({
            type: "upi",
            label: "UPI ID / VPA",
            value: m[0],
            category: "financial",
            severity: "HIGH",
            risk_weight: 25,
            start: m.index,
            end: m.index + m[0].length,
            valid: true,
            explanation: "Virtual Payment Address linked to personal banking."
        });
    }

    // 5. Bank Account Number
    const bankRegex = /\b(?:account|acc|a\/c|bank)[\s#:]*([0-9]{9,18})\b/gi;
    while ((m = bankRegex.exec(text)) !== null) {
        items.push({
            type: "bank_account",
            label: "Bank Account Number",
            value: m[1],
            category: "financial",
            severity: "HIGH",
            risk_weight: 30,
            start: m.index,
            end: m.index + m[0].length,
            valid: true,
            explanation: "Direct bank account number."
        });
    }

    // 6. Indian Mobile Phone Number
    const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{9}\b/g;
    while ((m = phoneRegex.exec(text)) !== null) {
        // avoid matching within card or account
        if (!items.some(i => i.start <= m.index && i.end >= m.index + m[0].length)) {
            items.push({
                type: "phone",
                label: "Mobile Phone Number",
                value: m[0],
                category: "contact",
                severity: "MEDIUM",
                risk_weight: 20,
                start: m.index,
                end: m.index + m[0].length,
                valid: true,
                explanation: "Direct cellular contact number."
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
                end: m.index + m[0].length,
                valid: true,
                explanation: "Direct contact email."
            });
        }
    }

    // 8. Financial Amount
    const amountRegex = /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d{2})?/gi;
    while ((m = amountRegex.exec(text)) !== null) {
        items.push({
            type: "amount",
            label: "Transaction Amount",
            value: m[0],
            category: "financial",
            severity: "LOW",
            risk_weight: 10,
            start: m.index,
            end: m.index + m[0].length,
            valid: true,
            explanation: "Monetary transaction figure."
        });
    }

    return items;
}

// Calculate Risk
function calculateRisk(items) {
    if (!items || items.length === 0) return { score: 0, level: "LOW" };
    let raw = items.reduce((acc, i) => acc + (i.risk_weight || 15), 0);
    let score = Math.min(100, Math.round(raw));
    let level = score >= 70 ? "HIGH" : (score >= 40 ? "MEDIUM" : "LOW");
    return { score, level };
}

// Purpose Minimization Rules
function analyzePurpose(purpose, detected) {
    const keepTypes = {
        expense_reimbursement: ["amount", "date", "merchant"],
        bank_verification: ["bank_account", "ifsc", "name"],
        loan_application: ["amount", "salary", "pan", "name"],
        job_application: ["name", "email", "phone"],
        general_sharing: [],
        public_posting: []
    };

    const allowed = keepTypes[purpose] || ["amount", "date"];
    const recommendations = (detected || []).map(item => {
        const isKeep = allowed.includes(item.type);
        return {
            type: item.type,
            label: item.label || item.type,
            decision: isKeep ? "KEEP" : "PROTECT",
            reason: isKeep
                ? `Necessary for the stated purpose of ${purpose.replace(/_/g, " ")}.`
                : `Not essential for ${purpose.replace(/_/g, " ")}; redacting to minimize exposure.`
        };
    });

    const total_keep = recommendations.filter(r => r.decision === "KEEP").length;
    const total_protect = recommendations.filter(r => r.decision === "PROTECT").length;

    return {
        success: true,
        purpose,
        recommendations,
        total_keep,
        total_protect
    };
}

// Text Redaction
function redactText(text, detected, decisions) {
    let result = text;
    let protected_count = 0;
    let kept_count = 0;

    // Sort detected items by start descending so replacement offsets remain valid
    const sorted = [...(detected || [])].sort((a, b) => b.start - a.start);

    for (const item of sorted) {
        const decision = (decisions && decisions[item.type]) || "PROTECT";
        if (decision === "PROTECT") {
            const token = `[REDACTED ${item.type.toUpperCase()}]`;
            result = result.slice(0, item.start) + token + result.slice(item.end);
            protected_count++;
        } else {
            kept_count++;
        }
    }

    const sha256 = crypto.createHash("sha256").update(result).digest("hex");
    const exposure_reduction = detected && detected.length > 0
        ? Math.round((protected_count / detected.length) * 100)
        : 100;

    return {
        success: true,
        protected_text: result,
        protected_count,
        kept_count,
        exposure_reduction,
        receipt: {
            sha256,
            timestamp: new Date().toISOString()
        }
    };
}

// Create HTTP Server
const server = http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // 1. API: Health Check
    if (pathname === "/api/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "PrivacyGuard", engine: "Node.js Local Engine" }));
        return;
    }

    // 2. API: Stats
    if (pathname === "/api/stats" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            stats: {
                total_scans: 124,
                leaks_averted: 58,
                average_exposure_reduction: 76.5
            }
        }));
        return;
    }

    // 3. API: Scan Text
    if (pathname === "/api/scan/text" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                const detected = detectPII(data.text || "");
                const risk = calculateRisk(detected);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    total_detected: detected.length,
                    risk,
                    detected
                }));
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
            }
        });
        return;
    }

    // 4. API: Analyze Purpose
    if (pathname === "/api/analyze/purpose" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                const result = analyzePurpose(data.purpose || "expense_reimbursement", data.detected || []);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
            }
        });
        return;
    }

    // 5. API: Protect Text
    if (pathname === "/api/protect/text" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                const result = redactText(data.text || "", data.detected || [], data.decisions || {});
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
            }
        });
        return;
    }

    // 6. Static File Serving
    // Route root to landing.html
    let filePath = "";
    if (pathname === "/" || pathname === "/index.html") {
        filePath = path.join(FRONTEND_DIR, "html", "landing.html");
    } else if (pathname.startsWith("/html/")) {
        filePath = path.join(FRONTEND_DIR, pathname);
    } else if (pathname.startsWith("/css/")) {
        filePath = path.join(FRONTEND_DIR, pathname);
    } else if (pathname.startsWith("/js/")) {
        filePath = path.join(FRONTEND_DIR, pathname);
    } else if (pathname.startsWith("/extension/")) {
        filePath = path.join(EXTENSION_DIR, pathname.replace("/extension/", ""));
    } else {
        filePath = path.join(FRONTEND_DIR, pathname);
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        res.writeHead(200, { "Content-Type": contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, HOST, () => {
    console.log("====================================================");
    console.log(`🛡️  PrivacyGuard Local Engine Running on http://${HOST}:${PORT}`);
    console.log(`👉 Web App URL: http://${HOST}:${PORT}/`);
    console.log(`👉 Press CTRL+C to stop the server.`);
    console.log("====================================================");
});
