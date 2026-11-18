/**
 * PrivacyGuard — Multi-Domain Audit Loggers Console Controller
 * 
 * Provides an interactive UI console for inspecting the 6 dedicated loggers:
 * 1. AuthLogger      — Authentication, OAuth 2.0 handshake, anti-CSRF, JWT issuance & verification.
 * 2. SecurityLogger  — PII discovery, risk scores, purpose policies, cryptographic redaction, SHA-256 receipts.
 * 3. AiLogger        — ReAct autonomous cycles, tool invocations, RAG vector retrieval, token/cost monitoring.
 * 4. DatabaseLogger  — NoSQL MongoDB aggregations, schema embeddings, IXSCAN index plans, SQL ACID transactions.
 * 5. HttpLogger      — RESTful routes, HTTP status codes, response latency (ms), client IPs.
 * 6. SystemLogger    — Redis cache hit/miss/evict, Stripe checkout & webhooks, cron jobs, WebSockets.
 */

(function () {
    let modalOverlay = null;
    let activeCategory = "all";
    let autoRefreshTimer = null;
    let isAutoRefresh = true;

    const CATEGORIES = [
        { id: "all", label: "All Matters", icon: "🌐" },
        { id: "auth", label: "Auth & Identity", icon: "🔐", matterTag: "auth.log" },
        { id: "security", label: "Security & PII", icon: "🛡️", matterTag: "security.log" },
        { id: "ai_agent", label: "AI Agent & RAG", icon: "🤖", matterTag: "ai_agent.log" },
        { id: "database", label: "Database & SQL", icon: "🗄️", matterTag: "database.log" },
        { id: "http", label: "HTTP Network", icon: "📡", matterTag: "http.log" },
        { id: "system", label: "System & Cache", icon: "⚙️", matterTag: "system.log" }
    ];

    function initLoggerConsole() {
        if (document.getElementById("pgLoggersModal")) return;

        modalOverlay = document.createElement("div");
        modalOverlay.id = "pgLoggersModal";
        modalOverlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(3, 7, 18, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 9999999;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, sans-serif;
        `;

        modalOverlay.innerHTML = `
            <div style="position: relative; width: 950px; max-width: 100%; height: 680px; max-height: 90vh; background: #0b0f19; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(79, 70, 229, 0.15); display: flex; flex-direction: column; overflow: hidden; color: #f8fafc;">
                
                <!-- Header -->
                <div style="padding: 18px 24px; background: rgba(15, 23, 42, 0.9); border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">📋</span>
                        <div>
                            <div style="font-size: 16px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 10px;">
                                PrivacyGuard Multi-Domain Audit Loggers
                                <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399;">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pgPulse 1.5s infinite;"></span>
                                    LIVE ENGINE
                                </span>
                            </div>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">
                                Every logger has its own domain and matters — writing to dedicated log channels
                            </div>
                        </div>
                    </div>
                    <button type="button" id="pgCloseLoggersBtn" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: all 0.2s;">
                        &times;
                    </button>
                </div>

                <!-- Domain Filter Tabs -->
                <div style="padding: 10px 24px; background: rgba(15, 23, 42, 0.6); border-bottom: 1px solid rgba(255, 255, 255, 0.06); display: flex; gap: 8px; overflow-x: auto;" id="pgLoggerTabs">
                    ${CATEGORIES.map(c => `
                        <button type="button" class="pg-log-tab ${c.id === 'all' ? 'active' : ''}" data-cat="${c.id}" style="padding: 6px 12px; border-radius: 8px; border: 1px solid ${c.id === 'all' ? '#6366f1' : 'rgba(255,255,255,0.1)'}; background: ${c.id === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)'}; color: ${c.id === 'all' ? '#fff' : '#94a3b8'}; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: all 0.2s;">
                            <span>${c.icon}</span>
                            <span>${c.label}</span>
                        </button>
                    `).join("")}
                </div>

                <!-- Logger Matter Summary Bar -->
                <div style="padding: 8px 24px; background: rgba(30, 41, 59, 0.4); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: #94a3b8;">
                    <div id="pgLoggerMatterDescription">
                        Showing all domain matters: Auth, Security, AI Agent, Database, HTTP, and System
                    </div>
                    <div style="display: flex; gap: 14px; align-items: center;">
                        <span id="pgLogTotalBadge">Total Entries: --</span>
                        <button type="button" id="pgRefreshLogsBtn" style="background: none; border: none; color: #818cf8; cursor: pointer; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                <!-- Log Stream Terminal -->
                <div id="pgLogTerminal" style="flex: 1; padding: 16px 20px; overflow-y: auto; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.6; background: #070a13;">
                    <div style="color: #64748b; text-align: center; padding: 40px 0;">
                        Loading live domain logs...
                    </div>
                </div>

                <!-- Terminal Footer -->
                <div style="padding: 10px 24px; background: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b;">
                    <div style="display: flex; gap: 16px;">
                        <span>📁 Storage: <code style="color: #818cf8;">logs/*.log</code></span>
                        <span>🔒 Anti-Tamper: <code style="color: #10b981;">Masked Secrets</code></span>
                        <span>⚡ Format: <code style="color: #cbd5e1;">ISO-8601 + Matter Tags</code></span>
                    </div>
                    <div>
                        API Endpoint: <a href="/api/v1/logs" target="_blank" style="color: #818cf8; text-decoration: none;">/api/v1/logs</a>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Close button & backdrop click
        document.getElementById("pgCloseLoggersBtn").addEventListener("click", closeLoggerConsole);
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) closeLoggerConsole();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modalOverlay.style.display === "flex") {
                closeLoggerConsole();
            }
        });

        // Tab switching
        modalOverlay.querySelectorAll(".pg-log-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                modalOverlay.querySelectorAll(".pg-log-tab").forEach(t => {
                    t.style.background = "rgba(255,255,255,0.03)";
                    t.style.borderColor = "rgba(255,255,255,0.1)";
                    t.style.color = "#94a3b8";
                });
                tab.style.background = "rgba(99, 102, 241, 0.2)";
                tab.style.borderColor = "#6366f1";
                tab.style.color = "#ffffff";

                activeCategory = tab.getAttribute("data-cat");
                updateMatterDescription();
                fetchLogs();
            });
        });

        document.getElementById("pgRefreshLogsBtn").addEventListener("click", () => {
            fetchLogs();
        });
    }

    function updateMatterDescription() {
        const descEl = document.getElementById("pgLoggerMatterDescription");
        if (!descEl) return;
        const catMap = {
            all: "Showing all domain matters: Auth, Security, AI Agent, Database, HTTP, and System.",
            auth: "AuthLogger matters: OAuth 2.0 handshake, anti-CSRF state tokens, JWT issuance & verification, PBKDF2 hashing. (logs/auth.log)",
            security: "SecurityLogger matters: PII detection scans, risk scores, purpose policy minimization, cryptographic redaction, SHA-256 receipts. (logs/security.log)",
            ai_agent: "AiLogger matters: ReAct autonomous thought-action cycles, tool execution, RAG embeddings, token cost tracking. (logs/ai_agent.log)",
            database: "DatabaseLogger matters: NoSQL MongoDB aggregation pipelines, schema modeling, IXSCAN index plans, SQL ACID transactions. (logs/database.log)",
            http: "HttpLogger matters: Incoming requests, response latency ms, HTTP status codes (200, 201, 204, 400, 429), client IP. (logs/http.log)",
            system: "SystemLogger matters: Redis caching hit/miss/evict, Stripe checkout & webhooks, cron retention purges, WebSockets. (logs/system.log)"
        };
        descEl.textContent = catMap[activeCategory] || catMap.all;
    }

    async function fetchLogs() {
        const terminal = document.getElementById("pgLogTerminal");
        const totalBadge = document.getElementById("pgLogTotalBadge");
        if (!terminal) return;

        try {
            const url = activeCategory === "all" ? "/api/v1/logs?limit=80" : `/api/v1/logs?category=${activeCategory}&limit=80`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            const logs = data.data || [];

            if (totalBadge) totalBadge.textContent = `Total Entries: ${data.count || logs.length}`;

            if (logs.length === 0) {
                terminal.innerHTML = `<div style="color: #64748b; text-align: center; padding: 40px 0;">No log entries recorded for ${activeCategory} yet. Trigger an action to see real-time matters logged.</div>`;
                return;
            }

            terminal.innerHTML = logs.map(entry => {
                const time = entry.timestamp ? entry.timestamp.split("T")[1].replace("Z", "") : "";
                let levelBadge = "";
                let levelColor = "#38bdf8";
                if (entry.level === "AUDIT") { levelColor = "#c084fc"; levelBadge = "AUDIT"; }
                else if (entry.level === "WARN") { levelColor = "#fbbf24"; levelBadge = "WARN"; }
                else if (entry.level === "ERROR") { levelColor = "#f87171"; levelBadge = "ERROR"; }
                else { levelColor = "#34d399"; levelBadge = "INFO"; }

                const metaStr = entry.meta && Object.keys(entry.meta).length > 0 ? JSON.stringify(entry.meta) : "";

                return `
                    <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                            <span style="color: #475569; font-size: 11px;">${time}</span>
                            <span style="color: #818cf8; font-weight: 700;">[${entry.label}]</span>
                            <span style="color: ${levelColor}; font-weight: 600; font-size: 11px;">[${levelBadge}]</span>
                            <span style="color: #fb923c; font-weight: 600;">[${entry.matter}]</span>
                            <span style="color: #e2e8f0;">${escapeHtml(entry.message)}</span>
                        </div>
                        ${metaStr ? `<div style="color: #64748b; font-size: 11px; padding-left: 24px; word-break: break-all;">↳ ${escapeHtml(metaStr)}</div>` : ''}
                    </div>
                `;
            }).join("");

        } catch (e) {
            terminal.innerHTML = `<div style="color: #f87171; text-align: center; padding: 30px 0;">Failed to fetch logs: ${escapeHtml(e.message)}</div>`;
        }
    }

    function escapeHtml(str) {
        return (str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function openLoggerConsole(category = "all") {
        initLoggerConsole();
        activeCategory = category;
        updateMatterDescription();
        modalOverlay.style.display = "flex";
        fetchLogs();

        // Auto-refresh every 3.5 seconds while open
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(() => {
            if (modalOverlay.style.display === "flex") {
                fetchLogs();
            }
        }, 3500);
    }

    function closeLoggerConsole() {
        if (modalOverlay) modalOverlay.style.display = "none";
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }

    // Auto-bind to button on page load
    document.addEventListener("DOMContentLoaded", () => {
        initLoggerConsole();
        const btn = document.getElementById("openLoggersConsoleBtn");
        if (btn) {
            btn.addEventListener("click", () => openLoggerConsole("all"));
        }
    });

    window.PrivacyGuardLoggers = {
        open: openLoggerConsole,
        close: closeLoggerConsole,
        fetch: fetchLogs
    };
})();
