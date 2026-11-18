/**
 * PrivacyGuard — Landing Page JavaScript
 *
 * Modules:
 * 1. Theme
 * 2. Hero scanner
 * 3. Ambient canvas
 * 4. 3D scanner tilt
 * 5. Card tilt
 * 6. Marquee
 * 7. Sandbox PII detection
 * 8. Stats
 * 9. Navigation
 * 10. Toast
 */


/* =========================================================
   GLOBAL STATE
========================================================= */

window.isScannerProtected = false;


/* =========================================================
   PROTECT & SHARE
========================================================= */

window.handleProtectShareClick = function(event) {

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const protectBtn =
        document.getElementById("protectShareBtn");

    const protectBtnText =
        document.getElementById("protectBtnText");

    const tokenAadhaar =
        document.getElementById("tokenAadhaar");

    const tokenPhone =
        document.getElementById("tokenPhone");

    const scanningBadge =
        document.getElementById("scanningBadge");

    const scanningStatusText =
        document.getElementById("scanningStatusText");

    const detectionBox =
        document.getElementById("detectionBox");

    const detectionHeadline =
        document.getElementById("detectionHeadline");

    const badgeAadhaar =
        document.getElementById("badgeAadhaar");

    const badgePhone =
        document.getElementById("badgePhone");

    const warningIcon =
        document.getElementById("warningIcon");

    const laserBeam =
        document.getElementById("laserBeam");


    if (!protectBtn) {
        return;
    }


    window.isScannerProtected =
        !window.isScannerProtected;


    const originalAadhaar =
        "4567 8912 3456";

    const originalPhone =
        "9876543210.";


    if (window.isScannerProtected) {

        /* Laser animation */

        if (laserBeam) {

            laserBeam.classList.remove("active");

            void laserBeam.offsetWidth;

            laserBeam.classList.add("active");

            setTimeout(() => {
                laserBeam.classList.remove("active");
            }, 2000);
        }


        /* Mask Aadhaar */

        if (tokenAadhaar) {

            tokenAadhaar.textContent =
                "4567 •••• 3456";

            tokenAadhaar.classList.add("masked");
        }


        /* Mask phone */

        if (tokenPhone) {

            tokenPhone.textContent =
                "••••••••10.";

            tokenPhone.classList.add("masked");
        }


        /* Scanner status */

        if (scanningBadge) {
            scanningBadge.classList.add("protected");
        }

        if (scanningStatusText) {
            scanningStatusText.textContent =
                "Protected ✓";
        }


        /* Detection box */

        if (detectionBox) {
            detectionBox.classList.add("protected");
        }

        if (detectionHeadline) {
            detectionHeadline.textContent =
                "2 sensitive items safely masked";
        }


        /* Aadhaar badge */

        if (badgeAadhaar) {

            badgeAadhaar.textContent =
                "Masked ✓";

            badgeAadhaar.className =
                "severity-badge badge-safe";
        }


        /* Phone badge */

        if (badgePhone) {

            badgePhone.textContent =
                "Protected ✓";

            badgePhone.className =
                "severity-badge badge-safe";
        }


        /* Check icon */

        if (warningIcon) {

            warningIcon.innerHTML = `
                <svg viewBox="0 0 20 20">
                    <path
                        fill="currentColor"
                        d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
                    />
                </svg>
            `;
        }


        /* Button */

        protectBtn.classList.add("is-protected");

        if (protectBtnText) {

            protectBtnText.textContent =
                "✓ Protected";
        }


        showToast(
            "🛡️ Sensitive information protected before sharing."
        );

    } else {


        /* Restore */

        if (tokenAadhaar) {

            tokenAadhaar.textContent =
                originalAadhaar;

            tokenAadhaar.classList.remove("masked");
        }


        if (tokenPhone) {

            tokenPhone.textContent =
                originalPhone;

            tokenPhone.classList.remove("masked");
        }


        if (scanningBadge) {
            scanningBadge.classList.remove("protected");
        }

        if (scanningStatusText) {
            scanningStatusText.textContent =
                "Scanning...";
        }


        if (detectionBox) {
            detectionBox.classList.remove("protected");
        }


        if (detectionHeadline) {
            detectionHeadline.textContent =
                "2 sensitive items detected";
        }


        if (badgeAadhaar) {

            badgeAadhaar.textContent =
                "Critical";

            badgeAadhaar.className =
                "severity-badge badge-critical";
        }


        if (badgePhone) {

            badgePhone.textContent =
                "High";

            badgePhone.className =
                "severity-badge badge-high";
        }


        if (warningIcon) {

            warningIcon.innerHTML = `
                <svg viewBox="0 0 20 20">
                    <path
                        fill="currentColor"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92Z"
                    />
                    <path
                        fill="white"
                        d="M10 7v4"
                        stroke="white"
                        stroke-width="1.8"
                        stroke-linecap="round"
                    />
                    <circle
                        cx="10"
                        cy="13.5"
                        r="1"
                        fill="white"
                    />
                </svg>
            `;
        }


        protectBtn.classList.remove(
            "is-protected"
        );

        if (protectBtnText) {

            protectBtnText.textContent =
                "Protect & Share";
        }


        showToast(
            "⚠️ Preview reset."
        );
    }
};


/* =========================================================
   BOOTSTRAP
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        safeExecute(
            "ThemeToggle",
            initThemeToggle
        );

        safeExecute(
            "HeroMockup",
            initHeroMockup
        );

        safeExecute(
            "AmbientCanvas",
            initAmbientCanvas
        );

        safeExecute(
            "Parallax3D",
            initParallax3D
        );

        safeExecute(
            "CardsTilt3D",
            initCardsTilt3D
        );

        safeExecute(
            "Marquees",
            initMarquees
        );

        safeExecute(
            "FeaturePillarsMarquee",
            initFeaturePillarsMarquee
        );

        safeExecute(
            "InteractiveSandbox",
            initInteractiveSandbox
        );

        safeExecute(
            "LiveMetrics",
            initLiveMetrics
        );

        safeExecute(
            "StatsCounter",
            initStatsCounter
        );

        safeExecute(
            "Navigation",
            initNavigation
        );

        safeExecute(
            "HowItWorksDemoVideo",
            initHowItWorksDemoVideo
        );

    }
);


/* =========================================================
   ERROR BOUNDARY
========================================================= */

function safeExecute(name, fn) {

    try {

        fn();

    } catch (error) {

        console.warn(
            `[PrivacyGuard] ${name} failed safely:`,
            error
        );
    }
}


/* =========================================================
   THEME
========================================================= */

function initThemeToggle() {

    const button =
        document.getElementById(
            "themeToggleBtn"
        );

    const root =
        document.documentElement;


    let savedTheme = null;

    try {

        savedTheme =
            localStorage.getItem(
                "pg_theme_v2"
            );

    } catch (_) {}


    let currentTheme =
        savedTheme ||
        "dark";


    root.setAttribute(
        "data-theme",
        currentTheme
    );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            currentTheme =
                root.getAttribute(
                    "data-theme"
                ) === "dark"
                    ? "light"
                    : "dark";


            root.setAttribute(
                "data-theme",
                currentTheme
            );


            if (typeof window.setPrivacyGuardTheme === "function") {
                window.setPrivacyGuardTheme(currentTheme);
            } else {
                try {
                    localStorage.setItem(
                        "pg_theme_v2",
                        currentTheme
                    );
                } catch (_) {}
            }


            showToast(
                currentTheme === "dark"
                    ? "🌙 Dark mode enabled"
                    : "☀️ Light mode enabled"
            );
        }
    );
}


/* =========================================================
   HERO MOCKUP
========================================================= */

function initHeroMockup() {

    const button =
        document.getElementById(
            "protectShareBtn"
        );

    if (!button) {
        return;
    }


    /* HTML already has onclick.
       No second listener needed.
       This prevents duplicate execution. */
}


/* =========================================================
   AMBIENT CANVAS
========================================================= */

function initAmbientCanvas() {

    const canvas =
        document.getElementById(
            "ambientCanvas"
        );

    if (!canvas) {
        return;
    }

    if (window.initPrivacyGuardAmbientCanvas) {
        window.initPrivacyGuardAmbientCanvas();
        return;
    }

    if (canvas._pgAmbientInit) {
        return;
    }
    canvas._pgAmbientInit = true;

    const ctx =
        canvas.getContext("2d");

    if (!ctx) {
        return;
    }


    let width;
    let height;

    const particles = [];

    const particleCount = 36;


    function resize() {

        width =
            canvas.width =
                window.innerWidth;

        height =
            canvas.height =
                window.innerHeight;
    }


    resize();


    window.addEventListener(
        "resize",
        resize
    );


    for (
        let i = 0;
        i < particleCount;
        i++
    ) {

        particles.push({

            x: Math.random() * width,

            y: Math.random() * height,

            vx:
                (Math.random() - .5)
                * .35,

            vy:
                (Math.random() - .5)
                * .35,

            radius:
                Math.random() * 1.8 + .8,

            phase:
                Math.random() *
                Math.PI *
                2

        });
    }


    function animate() {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        const dark =
            document.documentElement
                .getAttribute("data-theme")
            === "dark";


        const dotColor =
            dark
                ? "rgba(116,125,255,.40)"
                : "rgba(74,84,235,.16)";


        const lineColor =
            dark
                ? "rgba(91,101,255,.11)"
                : "rgba(77,83,226,.055)";


        particles.forEach(
            (p, index) => {

                p.x += p.vx;
                p.y += p.vy;

                p.phase += .02;


                if (p.x < 0) {
                    p.x = width;
                }

                if (p.x > width) {
                    p.x = 0;
                }

                if (p.y < 0) {
                    p.y = height;
                }

                if (p.y > height) {
                    p.y = 0;
                }


                const radius =
                    p.radius +
                    Math.sin(p.phase) * .6;


                ctx.beginPath();

                ctx.arc(
                    p.x,
                    p.y,
                    radius,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    dotColor;

                ctx.fill();


                for (
                    let j = index + 1;
                    j < particles.length;
                    j++
                ) {

                    const p2 =
                        particles[j];


                    const dx =
                        p.x - p2.x;

                    const dy =
                        p.y - p2.y;


                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (distance < 120) {

                        ctx.beginPath();

                        ctx.moveTo(
                            p.x,
                            p.y
                        );

                        ctx.lineTo(
                            p2.x,
                            p2.y
                        );

                        ctx.strokeStyle =
                            lineColor;

                        ctx.lineWidth =
                            (1 - distance / 120)
                            * .8;

                        ctx.stroke();
                    }
                }
            }
        );


        requestAnimationFrame(
            animate
        );
    }


    requestAnimationFrame(
        animate
    );
}


/* =========================================================
   3D SCANNER TILT
========================================================= */

function initParallax3D() {

    const stage =
        document.getElementById(
            "mockupStage"
        );

    const card =
        document.getElementById(
            "scannerCard"
        );


    if (
        !stage ||
        !card ||
        window.innerWidth < 1024
    ) {
        return;
    }


    stage.addEventListener(
        "mousemove",
        event => {

            const rect =
                stage.getBoundingClientRect();


            const x =
                event.clientX -
                rect.left;


            const y =
                event.clientY -
                rect.top;


            const centerX =
                rect.width / 2;


            const centerY =
                rect.height / 2;


            const rotateX =
                ((y - centerY) / centerY)
                * -6;


            const rotateY =
                ((x - centerX) / centerX)
                * 6;


            card.style.transform =
                `perspective(1400px)
                 rotateX(${rotateX}deg)
                 rotateY(${rotateY}deg)
                 rotateZ(-2deg)
                 scale3d(1.012,1.012,1.012)`;


            card.style.setProperty(
                "--glare-x",
                `${(x / rect.width) * 100}%`
            );


            card.style.setProperty(
                "--glare-y",
                `${(y / rect.height) * 100}%`
            );

        }
    );


    stage.addEventListener(
        "mouseleave",
        () => {

            card.style.transform =
                "perspective(1400px) rotateX(0deg) rotateY(0deg) rotateZ(-4deg) scale3d(1,1,1)";

            card.style.setProperty(
                "--glare-x",
                "50%"
            );

            card.style.setProperty(
                "--glare-y",
                "30%"
            );
        }
    );
}


/* =========================================================
   CARD TILT
========================================================= */

function initCardsTilt3D() {

    if (window.innerWidth < 1024) {
        return;
    }


    const cards =
        document.querySelectorAll(
            ".pipeline-card, .step-card, .feature-box"
        );


    cards.forEach(card => {

        card.addEventListener(
            "mousemove",
            event => {

                const rect =
                    card.getBoundingClientRect();


                const x =
                    event.clientX -
                    rect.left;


                const y =
                    event.clientY -
                    rect.top;


                const rotateX =
                    ((y - rect.height / 2) /
                    (rect.height / 2)) *
                    -4;


                const rotateY =
                    ((x - rect.width / 2) /
                    (rect.width / 2)) *
                    4;


                card.style.transform =
                    `perspective(900px)
                     rotateX(${rotateX}deg)
                     rotateY(${rotateY}deg)
                     translateY(-6px)
                     scale(1.015)`;
            }
        );


        card.addEventListener(
            "mouseleave",
            () => {

                card.style.transform = "";
            }
        );

    });
}


/* =========================================================
   MARQUEES
========================================================= */

function initMarquees() {

    [
        "marqueeRailForward",
        "marqueeRailReverse"
    ].forEach(id => {

        const rail =
            document.getElementById(id);


        if (
            !rail ||
            rail.dataset.duplicated
        ) {
            return;
        }


        const children =
            Array.from(
                rail.children
            );


        children.forEach(item => {

            const clone =
                item.cloneNode(true);

            clone.setAttribute(
                "aria-hidden",
                "true"
            );

            rail.appendChild(clone);
        });


        rail.dataset.duplicated =
            "true";
    });
}

function initFeaturePillarsMarquee() {
    const track = document.querySelector(".feature-pillars-track");

    if (!track || track.dataset.duplicated) {
        return;
    }

    Array.from(track.children).forEach(item => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
    });

    track.dataset.duplicated = "true";
}


/* =========================================================
   SANDBOX
========================================================= */

/* =========================================================
   LIVE SYSTEM METRICS (BACKEND GET /api/stats)
========================================================= */

async function initLiveMetrics() {
    const elLeaks = document.getElementById("statLeaksAverted");
    const elItems = document.getElementById("statItemsProtected");
    const elReduc = document.getElementById("statExposureReduced");

    if (!elLeaks || !elItems || !elReduc) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch("http://127.0.0.1:8000/api/stats", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const data = await resp.json();
            if (data && data.success && data.stats) {
                const s = data.stats;
                elLeaks.textContent = s.leaks_averted !== undefined ? s.leaks_averted : "0";
                elItems.textContent = s.total_sensitive_items_protected !== undefined ? s.total_sensitive_items_protected : "0";
                elReduc.textContent = (s.average_exposure_reduction !== undefined ? s.average_exposure_reduction : 0) + "%";
                return;
            }
        }
    } catch (e) {
        console.warn("Backend /api/stats unreachable:", e);
    }

    // Graceful offline fallback per instructions: show '--', never display misleading fake data
    elLeaks.textContent = "--";
    elItems.textContent = "--";
    elReduc.textContent = "--%";
}


/* =========================================================
   PURPOSE-AWARE DEMO / SANDBOX (REAL BACKEND ENGINE)
========================================================= */

function initInteractiveSandbox() {
    const input = document.getElementById("customInputText");
    const scanButton = document.getElementById("runScanBtn");
    const redactButton = document.getElementById("redactCustomBtn");
    const beforePreview = document.getElementById("testerBeforePreview");
    const afterPreview = document.getElementById("testerAfterPreview");
    const status = document.getElementById("threatStatus");
    const keepItemsEl = document.getElementById("demoKeepItems");
    const protectItemsEl = document.getElementById("demoProtectItems");
    const statsStrip = document.getElementById("testerStatsStrip");
    const expReductionEl = document.getElementById("demoExposureReduction");
    const protCountEl = document.getElementById("demoProtectedCount");
    const receiptHashEl = document.getElementById("demoReceiptHash");
    const riskBeforeLabel = document.getElementById("demoRiskBeforeLabel");
    const riskAfterLabel = document.getElementById("demoRiskAfterLabel");
    const successBanner = document.getElementById("demoSuccessBanner");

    if (!input || !beforePreview) {
        return;
    }

    const presets = {
        expense: `Merchant: Uber India\nAmount: ₹2,850\nDate: 05 Sep 2026\nTransaction ID: TXN84927361\nBank Account: 4821 0098 7712\nUPI ID: rahul@bank\nAvailable Balance: ₹74,820\n\nOther Transactions:\nAmazon -₹4,299\nSwiggy -₹620\nElectricity -₹2,140`,
        aadhaar: "My Aadhaar is 4567 8912 3456 and my phone number is 9876543210.",
        credit: "Send payment receipt to alex.turner@company.com or charge card 4532-8910-2345-6789.",
        clean: "Hey team, let us meet tomorrow at 10 AM to discuss the product roadmap."
    };

    let activeSampleType = "expense";

    document.querySelectorAll(".preset-buttons .btn-chip").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".preset-buttons .btn-chip").forEach(b => b.classList.remove("active"));
            button.classList.add("active");

            const type = button.dataset.sample;
            activeSampleType = type;
            if (presets[type]) {
                input.value = presets[type];
                runDemo(false);
            }
        });
    });

    function escapeHtml(value) {
        return (value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function runDemo(applyMinimization = false) {
        const text = input.value || "";
        if (!text.trim()) {
            beforePreview.textContent = "Please enter document text above...";
            if (afterPreview) afterPreview.textContent = "Protected output appears here";
            if (status) status.textContent = "Empty content";
            return;
        }

        if (status) {
            status.textContent = applyMinimization ? "Minimizing via backend..." : "Scanning via backend...";
            status.className = "threat-status";
        }

        try {
            // STEP 1: Real backend scan -> POST /api/scan/text
            const scanController = new AbortController();
            const scanTimeout = setTimeout(() => scanController.abort(), 3500);

            const scanResp = await fetch("http://127.0.0.1:8000/api/scan/text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
                signal: scanController.signal
            });
            clearTimeout(scanTimeout);

            if (!scanResp.ok) throw new Error("Scan API returned status " + scanResp.status);
            const scanData = await scanResp.json();
            const detected = scanData.detected || [];
            const riskBefore = scanData.risk ? scanData.risk.score : 0;
            const riskLevel = scanData.risk ? scanData.risk.level : "SAFE";

            // Highlight sensitive items in the BEFORE pane
            let beforeHtml = escapeHtml(text);
            // Sort by length descending to prevent partial replacement bugs
            const sortedEntities = [...detected].sort((a, b) => b.value.length - a.value.length);
            sortedEntities.forEach(item => {
                const valSafe = escapeHtml(item.value);
                const badgeHtml = `<span class="decision-item-tag protect-tag" style="padding: 2px 6px; font-family: monospace;">${valSafe}</span>`;
                beforeHtml = beforeHtml.split(valSafe).join(badgeHtml);
            });
            beforePreview.innerHTML = beforeHtml || "<em>Content scanned safely.</em>";

            if (riskBeforeLabel) {
                riskBeforeLabel.textContent = `Risk: ${riskBefore} (${riskLevel})`;
            }

            // STEP 2: Real purpose minimization -> POST /api/analyze/purpose
            const purposeKey = activeSampleType === "expense" ? "expense_reimbursement" : "general_sharing";
            const purposeController = new AbortController();
            const purposeTimeout = setTimeout(() => purposeController.abort(), 3500);

            const purposeResp = await fetch("http://127.0.0.1:8000/api/analyze/purpose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    purpose: purposeKey,
                    detected: detected
                }),
                signal: purposeController.signal
            });
            clearTimeout(purposeTimeout);

            let decisions = {};
            if (purposeResp.ok) {
                const purposeData = await purposeResp.json();
                const recommendations = purposeData.recommendations || [];

                // Render dynamic KEEP vs PROTECT tags (deduplicated by label to prevent repeating tags)
                const keepList = recommendations.filter(r => r.decision === "KEEP");
                const protectList = recommendations.filter(r => r.decision === "PROTECT");

                const uniqueKeep = Array.from(new Set(keepList.map(r => r.label)));
                const uniqueProtect = Array.from(new Set(protectList.map(r => r.label)));

                if (keepItemsEl) {
                    keepItemsEl.innerHTML = uniqueKeep.length > 0
                        ? uniqueKeep.map(label => `<span class="decision-item-tag keep-tag">✓ ${escapeHtml(label)}</span>`).join(" ")
                        : `<span style="font-size: 0.74rem; color: var(--muted);">None strictly required</span>`;
                }

                if (protectItemsEl) {
                    protectItemsEl.innerHTML = uniqueProtect.length > 0
                        ? uniqueProtect.map(label => `<span class="decision-item-tag protect-tag">🔒 ${escapeHtml(label)}</span>`).join(" ")
                        : `<span style="font-size: 0.74rem; color: #10b981;">No sensitive data to protect</span>`;
                }

                recommendations.forEach(r => {
                    decisions[r.type.toLowerCase()] = r.decision;
                });
            }

            if (!applyMinimization) {
                if (status) {
                    status.textContent = `${detected.length} Sensitive Items Detected (Risk: ${riskBefore})`;
                    status.className = riskBefore >= 60 ? "threat-status" : "threat-status safe";
                }
                if (afterPreview) {
                    afterPreview.innerHTML = `<span style="color: var(--muted); font-style: italic;">Click '⚡ 2. Apply Expense Minimization' to see PrivacyGuard redact unnecessary data and generate an integrity receipt.</span>`;
                }
                if (riskAfterLabel) {
                    riskAfterLabel.textContent = "Risk: -- (Pending)";
                }
                if (statsStrip) statsStrip.style.display = "none";
                if (successBanner) successBanner.style.display = "none";
                showToast(`🔍 Scanned with real backend: ${detected.length} items detected (Risk: ${riskBefore})`);
                return;
            }

            // STEP 3: Real protection -> POST /api/protect/text
            const protectController = new AbortController();
            const protectTimeout = setTimeout(() => protectController.abort(), 3500);

            const protectResp = await fetch("http://127.0.0.1:8000/api/protect/text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    detected: detected,
                    decisions: decisions,
                    purpose: purposeKey,
                    scan_id: scanData.scan_id || null
                }),
                signal: protectController.signal
            });
            clearTimeout(protectTimeout);

            if (!protectResp.ok) throw new Error("Protect API returned status " + protectResp.status);
            const protectResult = await protectResp.json();

            // Populate AFTER pane
            if (afterPreview) {
                afterPreview.textContent = protectResult.protected_text;
            }

            if (riskAfterLabel) {
                const afterScore = (protectResult && typeof protectResult.risk_after === "number")
                    ? protectResult.risk_after
                    : 15;
                const afterLevel = afterScore >= 70 ? "HIGH" : (afterScore >= 40 ? "MEDIUM" : "SAFE");
                riskAfterLabel.textContent = `Risk: ${afterScore} (${afterLevel})`;
            }

            if (expReductionEl) {
                expReductionEl.textContent = `${protectResult.exposure_reduction}%`;
            }

            if (protCountEl) {
                protCountEl.textContent = `${protectResult.protected_count} items protected (${protectResult.kept_count} kept)`;
            }

            const receiptObj = protectResult.protection_receipt || protectResult.receipt;
            if (receiptHashEl && receiptObj) {
                const fullHash = receiptObj.hash || receiptObj.sha256 || "";
                if (fullHash) {
                    receiptHashEl.textContent = `${fullHash.slice(0, 8)}...${fullHash.slice(-5)}`;
                    receiptHashEl.title = `Full SHA-256 Receipt: ${fullHash}`;
                }
            }

            if (statsStrip) statsStrip.style.display = "flex";
            if (successBanner) successBanner.style.display = "flex";

            if (status) {
                status.textContent = "SAFE TO SHARE ✓";
                status.className = "threat-status safe";
            }

            showToast(`🛡 Minimized: ${protectResult.protected_count} protected, exposure reduced by ${protectResult.exposure_reduction}%!`);

            // Immediately refresh the live metrics banner with updated real stats
            initLiveMetrics();

        } catch (apiErr) {
            console.warn("Backend demo flow encountered an issue, running client fallback:", apiErr);
            if (status) status.textContent = "Backend Offline — Using Local Rules";
            beforePreview.textContent = text;
            if (afterPreview) afterPreview.textContent = text.replace(/4821\s0098\s7712/g, "••••••••7712").replace(/rahul@bank/g, "••••••••@bank");
        }
    }

    input.addEventListener("input", () => {
        // Light scan on typing
        runDemo(false);
    });

    if (scanButton) {
        scanButton.addEventListener("click", () => {
            runDemo(false);
        });
    }

    if (redactButton) {
        redactButton.addEventListener("click", () => {
            runDemo(true);
        });
    }

    // Run initial demo on page load
    runDemo(true);
}


/* =========================================================
   STATS
========================================================= */

function initStatsCounter() {

    const numbers =
        document.querySelectorAll(
            ".stat-number[data-target]"
        );


    if (!numbers.length) {
        return;
    }


    const section =
        document.querySelector(
            ".stats-bar-wrapper"
        );


    if (!section) {
        return;
    }


    let animated = false;


    const observer =
        new IntersectionObserver(
            entries => {

                if (
                    animated ||
                    !entries.some(
                        entry =>
                            entry.isIntersecting
                    )
                ) {
                    return;
                }


                animated = true;


                numbers.forEach(
                    element => {

                        const target =
                            parseInt(
                                element.dataset.target,
                                10
                            );


                        const duration =
                            1400;

                        const start =
                            performance.now();


                        function update(now) {

                            const progress =
                                Math.min(
                                    (now - start) /
                                    duration,
                                    1
                                );


                            const eased =
                                1 -
                                Math.pow(
                                    1 - progress,
                                    3
                                );


                            const current =
                                Math.floor(
                                    target *
                                    eased
                                );


                            if (
                                target === 99
                            ) {

                                element.textContent =
                                    `${current}%`;

                            } else if (
                                target === 3
                            ) {

                                element.textContent =
                                    `${current}x`;

                            } else {

                                element.textContent =
                                    `${current}K+`;
                            }


                            if (
                                progress < 1
                            ) {

                                requestAnimationFrame(
                                    update
                                );
                            }
                        }


                        requestAnimationFrame(
                            update
                        );
                    }
                );

            },
            {
                threshold: .3
            }
        );


    observer.observe(section);
}


/* =========================================================
   NAVIGATION
========================================================= */

function initNavigation() {

    const mobileButton =
        document.getElementById(
            "mobileMenuBtn"
        );

    const navLinks =
        document.getElementById(
            "navLinks"
        );


    if (
        mobileButton &&
        navLinks
    ) {

        mobileButton.addEventListener(
            "click",
            () => {

                navLinks.classList.toggle(
                    "open"
                );
            }
        );
    }


    const links =
        document.querySelectorAll(
            ".nav-link"
        );


    links.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                links.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                link.classList.add(
                    "active"
                );


                navLinks?.classList.remove(
                    "open"
                );
            }
        );
    });


    const sections =
        document.querySelectorAll(
            "section[id]"
        );


    window.addEventListener(
        "scroll",
        () => {

            let current = "";

            const scrollY =
                window.scrollY;


            sections.forEach(
                section => {

                    const top =
                        section.offsetTop -
                        150;

                    const bottom =
                        top +
                        section.offsetHeight;


                    if (
                        scrollY >= top &&
                        scrollY < bottom
                    ) {

                        current =
                            section.id;
                    }
                }
            );


            links.forEach(
                link => {

                    link.classList.remove(
                        "active"
                    );


                    if (
                        link.getAttribute(
                            "href"
                        ) ===
                        `#${current}`
                    ) {

                        link.classList.add(
                            "active"
                        );
                    }
                }
            );

        }
    );
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {
        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast";


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(10px)";

            toast.style.transition =
                "all .3s ease";


            setTimeout(
                () => toast.remove(),
                300
            );

        },
        3000
    );
}


/* =========================================================
   HOW IT WORKS — DEMO VIDEO PLAYER CONTROLLER
========================================================= */

function initHowItWorksDemoVideo() {
    const showcase = document.getElementById("demoVideoShowcase");
    if (!showcase) return;

    const playPauseBtn = document.getElementById("videoPlayPauseBtn");
    const restartBtn = document.getElementById("videoRestartBtn");
    const speedBtn = document.getElementById("videoSpeedBtn");
    const speedVal = document.getElementById("speedVal");
    const fullscreenBtn = document.getElementById("videoFullscreenBtn");
    const iconPlay = document.getElementById("iconPlay");
    const iconPause = document.getElementById("iconPause");
    const currentTimeEl = document.getElementById("videoCurrentTime");
    const totalTimeEl = document.getElementById("videoTotalTime");
    const timelineWrap = document.getElementById("videoTimelineWrap");
    const timelineFill = document.getElementById("videoTimelineFill");
    const scrubberHead = document.getElementById("videoScrubberHead");
    const playOverlay = document.getElementById("demoPlayOverlay");
    const bigPlayBtn = document.getElementById("bigPlayBtn");

    const customVideo = document.getElementById("customDemoVideo");
    const simulatedStream = document.getElementById("simulatedVideoStream");
    const laserLine = document.getElementById("demoLaserLine");
    const sourceToggleBtn = document.getElementById("videoSourceToggleBtn");
    const fileInput = document.getElementById("customVideoFileInput");

    const phaseBadge = document.getElementById("demoPhaseBadge");
    const phaseIcon = document.getElementById("demoPhaseIcon");
    const phaseText = document.getElementById("demoPhaseText");
    const statusSubtitle = document.getElementById("demoStatusSubtitle");

    const scenes = {
        1: document.getElementById("demoScene1"),
        2: document.getElementById("demoScene2"),
        3: document.getElementById("demoScene3"),
        4: document.getElementById("demoScene4")
    };

    const chapterBtns = {
        1: document.getElementById("chapterBtn1"),
        2: document.getElementById("chapterBtn2"),
        3: document.getElementById("chapterBtn3"),
        4: document.getElementById("chapterBtn4")
    };

    const stepCards = {
        1: document.getElementById("stepCard1"),
        2: document.getElementById("stepCard2"),
        3: document.getElementById("stepCard3"),
        4: document.getElementById("stepCard4")
    };

    // State
    const TOTAL_DURATION = 30.0;
    let currentTime = 0.0;
    let isPlaying = false;
    let playbackSpeed = 1.0;
    let timerId = null;
    let activeScene = 1;
    let usingRealVideo = false;

    const chapterStarts = {
        1: 0.0,
        2: 7.5,
        3: 15.0,
        4: 22.5
    };

    function formatTime(seconds) {
        const s = Math.floor(seconds);
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function updateUI() {
        if (!usingRealVideo) {
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = formatTime(TOTAL_DURATION);
            const progressPct = Math.min(100, Math.max(0, (currentTime / TOTAL_DURATION) * 100));
            timelineFill.style.width = `${progressPct}%`;
            scrubberHead.style.left = `${progressPct}%`;

            // Determine Scene
            let newScene = 1;
            if (currentTime >= chapterStarts[4]) newScene = 4;
            else if (currentTime >= chapterStarts[3]) newScene = 3;
            else if (currentTime >= chapterStarts[2]) newScene = 2;

            if (newScene !== activeScene) {
                switchScene(newScene);
            }
        }
    }

    function switchScene(sceneNum) {
        activeScene = sceneNum;
        Object.keys(scenes).forEach(num => {
            if (scenes[num]) {
                scenes[num].style.display = (parseInt(num) === sceneNum) ? "block" : "none";
            }
        });

        // Update Chapter Pills
        Object.keys(chapterBtns).forEach(num => {
            if (chapterBtns[num]) {
                chapterBtns[num].classList.toggle("active", parseInt(num) === sceneNum);
            }
        });

        // Update Step Cards Sync Glow
        Object.keys(stepCards).forEach(num => {
            if (stepCards[num]) {
                stepCards[num].classList.toggle("active-step-glow", parseInt(num) === sceneNum);
            }
        });

        // Update Badge & Status
        if (laserLine) {
            laserLine.classList.toggle("scanning", sceneNum === 1 && isPlaying);
        }

        if (sceneNum === 1) {
            if (phaseIcon) phaseIcon.textContent = "🔍";
            if (phaseText) phaseText.textContent = "PHASE 1: MULTIMODAL PII DETECTION";
            if (statusSubtitle) statusSubtitle.textContent = "OCR & Regex Engine Actively Scanning Document";
        } else if (sceneNum === 2) {
            if (phaseIcon) phaseIcon.textContent = "🎯";
            if (phaseText) phaseText.textContent = "PHASE 2: PURPOSE-AWARE EVALUATION";
            if (statusSubtitle) statusSubtitle.textContent = "Evaluating 'Expense Reimbursement' Allow/Deny Rules";
        } else if (sceneNum === 3) {
            if (phaseIcon) phaseIcon.textContent = "🛡️";
            if (phaseText) phaseText.textContent = "PHASE 3: STREAM ERADICATION & FORMAT MASKING";
            if (statusSubtitle) statusSubtitle.textContent = "Residual Risk Reduced to 0 (Safe) — 3 Leaks Averted";
        } else if (sceneNum === 4) {
            if (phaseIcon) phaseIcon.textContent = "🏆";
            if (phaseText) phaseText.textContent = "PHASE 4: CRYPTOGRAPHIC VERIFICATION & AUDIT";
            if (statusSubtitle) statusSubtitle.textContent = "SHA-256 Receipt Generated — Zero Raw PII in Database";
        }
    }

    function play() {
        if (usingRealVideo) {
            customVideo.play();
            return;
        }

        if (currentTime >= TOTAL_DURATION) {
            currentTime = 0.0;
        }

        isPlaying = true;
        if (playOverlay) playOverlay.classList.add("hidden");
        if (iconPlay) iconPlay.style.display = "none";
        if (iconPause) iconPause.style.display = "block";
        if (laserLine && activeScene === 1) laserLine.classList.add("scanning");

        const tickRateMs = 50;
        clearInterval(timerId);
        timerId = setInterval(() => {
            currentTime += (tickRateMs / 1000) * playbackSpeed;
            if (currentTime >= TOTAL_DURATION) {
                currentTime = TOTAL_DURATION;
                pause();
            }
            updateUI();
        }, tickRateMs);
    }

    function pause() {
        if (usingRealVideo) {
            customVideo.pause();
            return;
        }

        isPlaying = false;
        clearInterval(timerId);
        if (iconPlay) iconPlay.style.display = "block";
        if (iconPause) iconPause.style.display = "none";
        if (laserLine) laserLine.classList.remove("scanning");

        if (currentTime >= TOTAL_DURATION && playOverlay) {
            playOverlay.classList.remove("hidden");
        }
    }

    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    function seekTo(targetTime) {
        currentTime = Math.min(TOTAL_DURATION, Math.max(0, targetTime));
        updateUI();
    }

    // Attach Player Event Listeners
    if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlay);
    if (bigPlayBtn) bigPlayBtn.addEventListener("click", play);
    if (playOverlay) playOverlay.addEventListener("click", play);

    if (restartBtn) {
        restartBtn.addEventListener("click", () => {
            seekTo(0.0);
            play();
        });
    }

    if (speedBtn) {
        speedBtn.addEventListener("click", () => {
            if (playbackSpeed === 1.0) playbackSpeed = 1.5;
            else if (playbackSpeed === 1.5) playbackSpeed = 2.0;
            else playbackSpeed = 1.0;

            if (speedVal) speedVal.textContent = `${playbackSpeed}x`;
            if (usingRealVideo) customVideo.playbackRate = playbackSpeed;
        });
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                if (showcase.requestFullscreen) showcase.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
    }

    // Timeline Scrubbing
    if (timelineWrap) {
        timelineWrap.addEventListener("click", (e) => {
            const rect = timelineWrap.getBoundingClientRect();
            const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (usingRealVideo && customVideo.duration) {
                customVideo.currentTime = clickPos * customVideo.duration;
            } else {
                seekTo(clickPos * TOTAL_DURATION);
            }
        });
    }

    // Chapter Buttons Jump
    Object.keys(chapterBtns).forEach(ch => {
        const btn = chapterBtns[ch];
        if (btn) {
            btn.addEventListener("click", () => {
                seekTo(chapterStarts[ch]);
                play();
            });
        }
    });

    // Step Cards Jump
    Object.keys(stepCards).forEach(step => {
        const card = stepCards[step];
        if (card) {
            card.addEventListener("click", () => {
                seekTo(chapterStarts[step]);
                play();
                // Smooth scroll to showcase
                showcase.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        }
    });

    // Custom Video File Upload / Load MP4
    if (sourceToggleBtn && fileInput) {
        sourceToggleBtn.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                const videoURL = URL.createObjectURL(file);
                customVideo.src = videoURL;
                customVideo.style.display = "block";
                simulatedStream.style.display = "none";
                usingRealVideo = true;
                sourceToggleBtn.innerHTML = `<span>Active: ${file.name.substring(0, 12)}...</span>`;

                customVideo.onloadedmetadata = () => {
                    totalTimeEl.textContent = formatTime(customVideo.duration);
                };

                customVideo.ontimeupdate = () => {
                    currentTimeEl.textContent = formatTime(customVideo.currentTime);
                    const pct = (customVideo.currentTime / customVideo.duration) * 100;
                    timelineFill.style.width = `${pct}%`;
                    scrubberHead.style.left = `${pct}%`;
                };

                customVideo.onplay = () => {
                    isPlaying = true;
                    if (iconPlay) iconPlay.style.display = "none";
                    if (iconPause) iconPause.style.display = "block";
                };

                customVideo.onpause = () => {
                    isPlaying = false;
                    if (iconPlay) iconPlay.style.display = "block";
                    if (iconPause) iconPause.style.display = "none";
                };

                customVideo.play();
            }
        });
    }

    // Initial State Setup
    switchScene(1);
    updateUI();

    // Auto-pause when out of viewport
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting && isPlaying) {
                    pause();
                }
            });
        }, { threshold: 0.25 });
        observer.observe(showcase);
    }
}