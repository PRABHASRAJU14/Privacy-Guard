/**
 * PrivacyGuard — Universal Multi-Domain Logger System
 * 
 * Provides dedicated, domain-specific loggers where every logger manages its own specific matters:
 * 1. AuthLogger      — Authentication, OAuth 2.0 handshake, anti-CSRF, JWT issuance & verification, PBKDF2 hashing, RBAC.
 * 2. SecurityLogger  — PII detection, risk scoring, purpose minimization, cryptographic redaction, SHA-256 receipts, injection defense.
 * 3. AiLogger        — ReAct autonomous agent, function calling tools, RAG vector retrieval, token consumption & USD cost tracking.
 * 4. DatabaseLogger  — NoSQL MongoDB aggregations, schema modeling, IXSCAN index plans, SQL relational queries, ACID transactions.
 * 5. HttpLogger      — RESTful requests, response latency (ms), HTTP status codes, payload validation, IP rate limiting.
 * 6. SystemLogger    — Redis cache events, Stripe payment gateways, cron background jobs, SSR certificates, real-time WebSockets.
 */

const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.resolve(__dirname, "../../logs");

// Ensure logs directory exists
try {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
} catch (e) {
    console.error("[LoggerService] Unable to create logs directory:", e.message);
}

// In-memory circular buffer for fast API querying and live UI streaming
const MAX_BUFFER_PER_CATEGORY = 200;
const memoryBuffers = {
    auth: [],
    security: [],
    ai_agent: [],
    database: [],
    http: [],
    system: []
};

// Registered SSE stream listeners
const sseListeners = new Set();

class DomainLogger {
    constructor(category, label, filename) {
        this.category = category;
        this.label = label;
        this.filename = filename;
        this.filePath = path.join(LOGS_DIR, filename);
    }

    /**
     * Core logging dispatcher
     * @param {string} level - INFO | WARN | ERROR | AUDIT
     * @param {string} matter - The specific architectural matter/topic (e.g. OAUTH_HANDSHAKE, PII_DETECTION)
     * @param {string} message - Human-readable operational description
     * @param {object} meta - Structured metadata payload
     */
    log(level, matter, message, meta = {}) {
        const timestamp = new Date().toISOString();
        
        // Sanitize meta to prevent sensitive data leaks in logs (passwords, raw secret keys)
        const sanitizedMeta = this.sanitizeMeta(meta);

        const entry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp,
            category: this.category,
            label: this.label,
            level,
            matter,
            message,
            meta: sanitizedMeta
        };

        // 1. Store in memory buffer
        const buffer = memoryBuffers[this.category];
        if (buffer) {
            buffer.unshift(entry);
            if (buffer.length > MAX_BUFFER_PER_CATEGORY) {
                buffer.pop();
            }
        }

        // 2. Format line for log file
        const fileLine = `[${timestamp}] [${this.label}] [${level}] [${matter}] ${message} ${Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta) : ""}\n`;

        // 3. Append to dedicated log file
        try {
            fs.appendFile(this.filePath, fileLine, (err) => {
                if (err) {
                    // Fail silently to avoid crashing running server
                }
            });
        } catch (e) {}

        // 4. Output to console if not silenced
        if (process.env.LOG_LEVEL !== "SILENT") {
            const colorPrefix = this.getColorPrefix(level);
            console.log(`${colorPrefix}[${this.label}] [${matter}]\x1b[0m ${message}`);
        }

        // 5. Notify any live Server-Sent Events (SSE) listeners
        this.notifySseListeners(entry);

        return entry;
    }

    info(matter, message, meta) {
        return this.log("INFO", matter, message, meta);
    }

    warn(matter, message, meta) {
        return this.log("WARN", matter, message, meta);
    }

    error(matter, message, meta) {
        return this.log("ERROR", matter, message, meta);
    }

    audit(matter, message, meta) {
        return this.log("AUDIT", matter, message, meta);
    }

    sanitizeMeta(meta) {
        if (!meta || typeof meta !== "object") return {};
        const safe = { ...meta };
        const sensitiveKeys = ["password", "secret", "token", "apiKey", "credit_card", "cvv", "raw_key"];
        for (const k of Object.keys(safe)) {
            if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
                safe[k] = "****** [MASKED]";
            }
        }
        return safe;
    }

    getColorPrefix(level) {
        switch (level) {
            case "AUDIT": return "\x1b[35m"; // Magenta
            case "WARN":  return "\x1b[33m"; // Yellow
            case "ERROR": return "\x1b[31m"; // Red
            default:      return "\x1b[36m"; // Cyan
        }
    }

    notifySseListeners(entry) {
        if (sseListeners.size === 0) return;
        const payload = `data: ${JSON.stringify(entry)}\n\n`;
        for (const res of sseListeners) {
            try {
                res.write(payload);
            } catch (e) {
                sseListeners.delete(res);
            }
        }
    }
}

// Instantiate the 6 Domain-Specific Loggers with their own matters
const authLogger = new DomainLogger("auth", "AUTH", "auth.log");
const securityLogger = new DomainLogger("security", "SECURITY", "security.log");
const aiLogger = new DomainLogger("ai_agent", "AI_AGENT", "ai_agent.log");
const databaseLogger = new DomainLogger("database", "DATABASE", "database.log");
const httpLogger = new DomainLogger("http", "HTTP", "http.log");
const systemLogger = new DomainLogger("system", "SYSTEM", "system.log");

/**
 * Log Query & Management API
 */
function getLogs({ category, level, limit = 50 }) {
    let results = [];
    if (category && memoryBuffers[category]) {
        results = [...memoryBuffers[category]];
    } else {
        // Interleave all categories sorted by timestamp descending
        for (const cat of Object.keys(memoryBuffers)) {
            results.push(...memoryBuffers[cat]);
        }
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    if (level) {
        results = results.filter(e => e.level.toUpperCase() === level.toUpperCase());
    }

    return results.slice(0, Math.min(200, limit));
}

function getLogStats() {
    const stats = {};
    for (const cat of Object.keys(memoryBuffers)) {
        const list = memoryBuffers[cat];
        stats[cat] = {
            total: list.length,
            errors: list.filter(e => e.level === "ERROR").length,
            audits: list.filter(e => e.level === "AUDIT").length,
            warns: list.filter(e => e.level === "WARN").length,
            info: list.filter(e => e.level === "INFO").length,
            filename: `${cat}.log`
        };
    }
    return {
        timestamp: new Date().toISOString(),
        categories: stats,
        active_subscribers: sseListeners.size
    };
}

function registerSseClient(res) {
    sseListeners.add(res);
}

function unregisterSseClient(res) {
    sseListeners.delete(res);
}

// Initial Boot Log for each Domain Logger
authLogger.info("LOGGER_INIT", "Authentication & Identity Logger initialized. Ready for OAuth, JWT, and PBKDF2 matters.");
securityLogger.info("LOGGER_INIT", "Security & Threat Logger initialized. Ready for PII, differential privacy, and SHA-256 receipts.");
aiLogger.info("LOGGER_INIT", "AI Agent & Inference Logger initialized. Ready for ReAct cycles, tool calling, and RAG retrieval.");
databaseLogger.info("LOGGER_INIT", "Database & Audit Logger initialized. Ready for MongoDB pipelines and SQL ACID transactions.");
httpLogger.info("LOGGER_INIT", "HTTP & Network Logger initialized. Monitoring RESTful routes and response latency.");
systemLogger.info("LOGGER_INIT", "System & Integration Logger initialized. Monitoring Redis, Stripe, Cron, and WebSockets.");

module.exports = {
    authLogger,
    securityLogger,
    aiLogger,
    databaseLogger,
    httpLogger,
    systemLogger,
    getLogs,
    getLogStats,
    registerSseClient,
    unregisterSseClient,
    LOGS_DIR
};
