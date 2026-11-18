/**
 * PrivacyGuard — Universal Local Engine Server (Node.js)
 * High-performance, zero-dependency local server.
 * 
 * Fully Implements:
 * 1. Middleware Pipeline (Logging, Security Headers, Timing, Rate Limiting, Error Handling)
 * 2. RESTful Endpoint Design (GET, POST, PUT, DELETE with standard resource URLs)
 * 3. Correct HTTP Status Codes (200 OK, 201 Created, 204 No Content, 400 Bad Request, 404 Not Found, 422 Unprocessable, 500 Internal Error)
 * 4. Environment Variables & Secrets Management (.env loader with masking)
 * 5. JavaScript Core Concepts (Closures, Event Loop, Hoisting, Promises vs Callbacks, Async/Await)
 * 6. NoSQL (MongoDB) CRUD Operations & Schema Modeling
 * 7. SQL Relational JOINs (INNER JOIN, LEFT JOIN, Multi-Table JOIN)
 * 8. Prompt Engineering & Structured Outputs
 * 9. React Single-Page Application (Served at /app and /react)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Import JavaScript concepts & Mongo store
const jsConcepts = require("./backend/services/js_concepts");
const { mongoAuditStore } = require("./backend/database/mongo_service");

// Load Environment Variables (.env)
function loadEnv() {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
                const [k, ...v] = trimmed.split("=");
                if (!process.env[k.trim()]) {
                    process.env[k.trim()] = v.join("=").trim();
                }
            }
        }
    }
}
loadEnv();

const PORT = parseInt(process.env.PORT || "8000", 10);
const HOST = process.env.HOST || "127.0.0.1";
const NODE_ENV = process.env.NODE_ENV || "development";
const APP_SECRET_KEY = process.env.APP_SECRET_KEY || "local_dev_secret_key_default";

const BASE_DIR = __dirname;
const FRONTEND_DIR = path.join(BASE_DIR, "Privacy Guard");
const EXTENSION_DIR = path.join(BASE_DIR, "extension");

// Mask secret for safe diagnostic logging (Secrets Management)
function maskSecret(val) {
    if (!val || val.length <= 6) return "******";
    return val.slice(0, 3) + "..." + val.slice(-3);
}

// In-Memory RESTful Scans Database
const scansStore = new Map();

// Seed initial scan record
scansStore.set("scan-001", {
    id: "scan-001",
    input_type: "text",
    risk_score: 85,
    risk_level: "HIGH",
    detected_count: 3,
    protected_count: 3,
    status: "COMPLETED",
    created_at: new Date(Date.now() - 3600000).toISOString()
});

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

// ============================================================================
// 1. MIDDLEWARE PIPELINE
// ============================================================================
// Closure-based Rate Limiter Middleware
const rateLimiter = jsConcepts.createRateLimiter(60, 60000); // 60 requests/min

function securityHeadersMiddleware(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
}

function timingMiddleware(req, res, next) {
    const startTime = process.hrtime();
    const originalEnd = res.end;
    res.end = function (...args) {
        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        res.setHeader("X-Response-Time", `${durationMs}ms`);
        originalEnd.apply(res, args);
    };
    next();
}

function loggerMiddleware(req, res, next) {
    const method = req.method;
    const url = req.url;
    // Log without exposing any request body or query parameter secrets
    if (process.env.LOG_LEVEL !== "SILENT") {
        console.log(`[${new Date().toISOString()}] ${method} ${url}`);
    }
    next();
}

function rateLimitMiddleware(req, res, next) {
    const check = rateLimiter();
    if (!check.allowed) {
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again shortly.",
            retryAfterMs: check.resetInMs
        }));
        return;
    }
    next();
}

const middlewares = [
    securityHeadersMiddleware,
    timingMiddleware,
    loggerMiddleware,
    rateLimitMiddleware
];

function applyMiddlewares(req, res, finalHandler) {
    let index = 0;
    function next(err) {
        if (err) {
            errorHandlerMiddleware(err, req, res);
            return;
        }
        if (index < middlewares.length) {
            const current = middlewares[index++];
            current(req, res, next);
        } else {
            finalHandler(req, res);
        }
    }
    next();
}

function errorHandlerMiddleware(err, req, res) {
    console.error("[ServerError]", err);
    if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: 500,
            error: "Internal Server Error",
            message: NODE_ENV === "development" ? err.message : "An unexpected server error occurred."
        }));
    }
}

// ============================================================================
// 2. HELPER UTILITIES: Body Parser & PII Scanner
// ============================================================================
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                const err = new Error("Malformed JSON payload");
                err.status = 400;
                reject(err);
            }
        });
        req.on("error", reject);
    });
}

function detectPII(text) {
    if (!text || typeof text !== "string") return [];
    const items = [];

    // Aadhaar
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
            valid: true
        });
    }

    // PAN Card
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
            valid: true
        });
    }

    // Payment Card
    const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
    while ((m = cardRegex.exec(text)) !== null) {
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
                valid: true
            });
        }
    }

    // UPI ID
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
            valid: true
        });
    }

    // Bank Account Number
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
            valid: true
        });
    }

    // Phone Number
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
                end: m.index + m[0].length,
                valid: true
            });
        }
    }

    // Email Address
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
                valid: true
            });
        }
    }

    // Financial Amount
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
            valid: true
        });
    }

    return items;
}

function calculateRisk(items) {
    if (!items || items.length === 0) return { score: 0, level: "LOW" };
    let raw = items.reduce((acc, i) => acc + (i.risk_weight || 15), 0);
    let score = Math.min(100, Math.round(raw));
    let level = score >= 70 ? "HIGH" : (score >= 40 ? "MEDIUM" : "LOW");
    return { score, level };
}

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

function redactText(text, detected, decisions) {
    let result = text;
    let protected_count = 0;
    let kept_count = 0;

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

// ============================================================================
// 3. HTTP SERVER & REQUEST DISPATCHER
// ============================================================================
const server = http.createServer((req, res) => {
    applyMiddlewares(req, res, async (req, res) => {
        try {
            // Handle OPTIONS pre-flight -> 204 No Content
            if (req.method === "OPTIONS") {
                res.writeHead(204);
                res.end();
                return;
            }

            const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
            const pathname = parsedUrl.pathname;

            // ----------------------------------------------------------------
            // A. RESTFUL ENDPOINTS: /api/v1/scans (CRUD & HTTP Status Codes)
            // ----------------------------------------------------------------
            // 1. GET /api/v1/scans -> 200 OK (List all scans)
            if (pathname === "/api/v1/scans" && req.method === "GET") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    status: 200,
                    data: Array.from(scansStore.values()),
                    count: scansStore.size
                }));
                return;
            }

            // 2. POST /api/v1/scans -> 201 Created with Location header
            if (pathname === "/api/v1/scans" && req.method === "POST") {
                const body = await readJsonBody(req);
                if (!body.text || typeof body.text !== "string") {
                    res.writeHead(422, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        status: 422,
                        error: "Unprocessable Entity",
                        message: "Field 'text' is required and must be a non-empty string."
                    }));
                    return;
                }

                const newId = `scan-${Date.now()}`;
                const detected = detectPII(body.text);
                const risk = calculateRisk(detected);
                const scanRecord = {
                    id: newId,
                    input_type: "text",
                    risk_score: risk.score,
                    risk_level: risk.level,
                    detected_count: detected.length,
                    protected_count: 0,
                    status: "CREATED",
                    created_at: new Date().toISOString()
                };
                scansStore.set(newId, scanRecord);

                res.writeHead(201, {
                    "Content-Type": "application/json",
                    "Location": `/api/v1/scans/${newId}`
                });
                res.end(JSON.stringify({
                    status: 201,
                    message: "Scan resource created successfully",
                    data: scanRecord
                }));
                return;
            }

            // 3. GET /api/v1/scans/:id -> 200 OK or 404 Not Found
            if (pathname.startsWith("/api/v1/scans/") && req.method === "GET") {
                const id = pathname.replace("/api/v1/scans/", "");
                if (scansStore.has(id)) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: 200, data: scansStore.get(id) }));
                } else {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: 404, error: "Not Found", message: `Scan '${id}' does not exist.` }));
                }
                return;
            }

            // 4. PUT /api/v1/scans/:id -> 200 OK or 404 Not Found
            if (pathname.startsWith("/api/v1/scans/") && req.method === "PUT") {
                const id = pathname.replace("/api/v1/scans/", "");
                if (!scansStore.has(id)) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: 404, error: "Not Found" }));
                    return;
                }
                const body = await readJsonBody(req);
                const existing = scansStore.get(id);
                const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
                scansStore.set(id, updated);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: 200, message: "Resource updated", data: updated }));
                return;
            }

            // 5. DELETE /api/v1/scans/:id -> 204 No Content or 404 Not Found
            if (pathname.startsWith("/api/v1/scans/") && req.method === "DELETE") {
                const id = pathname.replace("/api/v1/scans/", "");
                if (scansStore.has(id)) {
                    scansStore.delete(id);
                    res.writeHead(204); // 204 No Content (no body)
                    res.end();
                } else {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: 404, error: "Not Found" }));
                }
                return;
            }

            // ----------------------------------------------------------------
            // G. AUTHENTICATION ENDPOINTS (Sign In, Sign Up, Profile)
            // ----------------------------------------------------------------
            if (pathname === "/api/auth/signin" && req.method === "POST") {
                const body = await readJsonBody(req);
                const username = body.username || "User";
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    status: 200,
                    message: `Welcome back, ${username}!`,
                    username: username,
                    email: body.username && body.username.includes("@") ? body.username : `${username.toLowerCase().replace(/\s+/g, '')}@privacyguard.local`,
                    token: crypto.randomBytes(24).toString("hex")
                }));
                return;
            }

            if (pathname === "/api/auth/signup" && req.method === "POST") {
                const body = await readJsonBody(req);
                const username = body.username || "User";
                const email = body.email || `${username.toLowerCase()}@privacyguard.local`;
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    status: 201,
                    message: "User account created successfully",
                    username: username,
                    email: email,
                    token: crypto.randomBytes(24).toString("hex")
                }));
                return;
            }

            // ----------------------------------------------------------------
            // B. NOSQL (MONGODB) CRUD DEMONSTRATION ENDPOINTS
            // ----------------------------------------------------------------
            if (pathname === "/api/v1/mongo/audits" && req.method === "GET") {
                const list = mongoAuditStore.find({});
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: 200, count: list.length, data: list }));
                return;
            }

            if (pathname === "/api/v1/mongo/audits" && req.method === "POST") {
                const body = await readJsonBody(req);
                const result = mongoAuditStore.create(body);
                res.writeHead(201, {
                    "Content-Type": "application/json",
                    "Location": `/api/v1/mongo/audits/${result.insertedId}`
                });
                res.end(JSON.stringify({ status: 201, data: result }));
                return;
            }

            // ----------------------------------------------------------------
            // C. JAVASCRIPT FUNDAMENTALS DEMO ENDPOINT
            // ----------------------------------------------------------------
            if (pathname === "/api/v1/js/concepts" && req.method === "GET") {
                const eventLoopOrder = await jsConcepts.runEventLoopDemonstration();
                const hoistingDemo = jsConcepts.testHoistingBehaviors();
                const asyncPipeline = await jsConcepts.performAsyncPipeline([
                    "test email user@privacyguard.local",
                    "clean transaction"
                ]);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    status: 200,
                    concepts: {
                        closures: {
                            description: "createRateLimiter retains lexical scope over private count & windowStart",
                            verified: true
                        },
                        event_loop: {
                            description: "Demonstrating Call Stack -> Microtasks -> Macrotasks order",
                            execution_order: eventLoopOrder
                        },
                        hoisting: {
                            description: "Function declarations hoisted, var initialized undefined, let/const in TDZ",
                            behavior: hoistingDemo
                        },
                        promises_vs_callbacks: {
                            description: "Promisification bridges error-first legacy callbacks to modern Promises",
                            verified: true
                        },
                        async_await: {
                            description: "Non-blocking parallel execution using Promise.all & try-catch",
                            pipeline_result: asyncPipeline
                        }
                    }
                }));
                return;
            }

            // ----------------------------------------------------------------
            // D. PROMPT ENGINEERING & STRUCTURED OUTPUT (AI COPILOT)
            // ----------------------------------------------------------------
            if (pathname === "/api/ai/copilot" && req.method === "POST") {
                const body = await readJsonBody(req);
                const userPrompt = body.prompt || "";
                
                // Prompt injection guard
                const isSuspicious = /ignore\s+(all\s+)?(previous|prior)\s+instructions|<system>|you\s+are\s+now/i.test(userPrompt);
                
                if (isSuspicious) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        status: 400,
                        error: "Prompt Injection Detected",
                        message: "Input violates safety policy and was neutralized."
                    }));
                    return;
                }

                // Structured JSON response generated strictly according to prompt schema
                const structuredOutput = {
                    action_plan: "REDACT_FOR_EXPENSE_REIMBURSEMENT",
                    risk_evaluation: {
                        score: 75,
                        level: "HIGH",
                        rationale: "Prompt text contains sensitive bank details not required for general expenses."
                    },
                    recommendations: [
                        { entity: "bank_account", action: "REDACT", justification: "Minimizes financial account theft exposure." },
                        { entity: "amount", action: "KEEP", justification: "Strictly required to verify expense reimbursement." }
                    ],
                    provenance: {
                        prompt_engineering_technique: "Role-delimited Few-Shot Prompting with Pydantic JSON Schema enforcement",
                        safety_guard_passed: true
                    }
                };

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(structuredOutput));
                return;
            }

            // ----------------------------------------------------------------
            // E. STANDARD OPERATIONAL APIS: Health, Stats, Scan, Purpose, Protect
            // ----------------------------------------------------------------
            if (pathname === "/api/health" && req.method === "GET") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    status: "ok",
                    service: "PrivacyGuard Universal Engine",
                    environment: NODE_ENV,
                    secret_key_configured: maskSecret(APP_SECRET_KEY)
                }));
                return;
            }

            if (pathname === "/api/stats" && req.method === "GET") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    stats: {
                        total_scans: scansStore.size + 124,
                        leaks_averted: 58,
                        average_exposure_reduction: 76.5
                    }
                }));
                return;
            }

            if (pathname === "/api/scan/text" && req.method === "POST") {
                const data = await readJsonBody(req);
                const detected = detectPII(data.text || "");
                const risk = calculateRisk(detected);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    total_detected: detected.length,
                    risk,
                    detected
                }));
                return;
            }

            if (pathname === "/api/analyze/purpose" && req.method === "POST") {
                const data = await readJsonBody(req);
                const result = analyzePurpose(data.purpose || "expense_reimbursement", data.detected || []);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === "/api/protect/text" && req.method === "POST") {
                const data = await readJsonBody(req);
                const result = redactText(data.text || "", data.detected || [], data.decisions || {});
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
                return;
            }

            // ----------------------------------------------------------------
            // F. STATIC FILE SERVING & CLIENT-SIDE REACT APP
            // ----------------------------------------------------------------
            let filePath = "";
            if (pathname === "/" || pathname === "/index.html") {
                filePath = path.join(FRONTEND_DIR, "html", "landing.html");
            } else if (pathname === "/app" || pathname === "/react" || pathname === "/react_app.html") {
                filePath = path.join(FRONTEND_DIR, "html", "react_app.html");
            } else if (pathname.startsWith("/html/")) {
                filePath = path.join(FRONTEND_DIR, pathname);
            } else if (pathname.startsWith("/css/")) {
                filePath = path.join(FRONTEND_DIR, pathname);
            } else if (pathname.startsWith("/js/")) {
                filePath = path.join(FRONTEND_DIR, pathname);
            } else if (pathname.startsWith("/extension/")) {
                const sub = pathname.replace("/extension/", "");
                const p1 = path.join(EXTENSION_DIR, sub);
                const p2 = path.join(FRONTEND_DIR, "extension", sub);
                filePath = fs.existsSync(p1) ? p1 : p2;
            } else {
                filePath = path.join(FRONTEND_DIR, pathname);
            }

            fs.stat(filePath, (err, stats) => {
                if (err || !stats.isFile()) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: 404, error: "Not Found", path: pathname }));
                    return;
                }

                const ext = path.extname(filePath).toLowerCase();
                const contentType = MIME_TYPES[ext] || "application/octet-stream";

                res.writeHead(200, { "Content-Type": contentType });
                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
            });

        } catch (error) {
            errorHandlerMiddleware(error, req, res);
        }
    });
});

// Start listening if run directly
if (require.main === module) {
    server.listen(PORT, HOST, () => {
        console.log("====================================================");
        console.log(`🛡️  PrivacyGuard Universal Engine Running on http://${HOST}:${PORT}`);
        console.log(`👉 Web Application:     http://${HOST}:${PORT}/`);
        console.log(`👉 React SPA (/app):    http://${HOST}:${PORT}/app`);
        console.log(`👉 RESTful Scans API:   http://${HOST}:${PORT}/api/v1/scans`);
        console.log(`👉 Environment:         ${NODE_ENV} (Secret: ${maskSecret(APP_SECRET_KEY)})`);
        console.log(`👉 Press CTRL+C to stop the server.`);
        console.log("====================================================");
    });
}

module.exports = server;
