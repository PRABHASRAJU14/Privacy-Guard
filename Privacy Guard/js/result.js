/* =========================================================
   PRIVACYGUARD — RESULTS PAGE
========================================================= */

const STORAGE_KEY =
    "privacyGuardScanData";


/* =========================================================
   PAGE START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadResults();

        initSorting();

        initButtons();

        initAmbientCanvas();

    }
);


/* =========================================================
   LOAD SCAN RESULTS
========================================================= */

function loadResults() {

    let storedData = null;


    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (raw) {

            storedData =
                JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "Unable to load scan data",
            error
        );
    }


    /*
     * If there is no scan data,
     * show demo data.
     *
     * This prevents the page from
     * looking empty during your
     * hackathon presentation.
     */

    if (!storedData) {

        storedData = {

            originalText:
                "Hi sir, my name is Rahul Kumar. My Aadhaar number is 4567 8912 3456 and my phone number is 9876543210. Please send the payment receipt to alex.turner@company.com.",

            detectedPII: [

                {
                    type:
                        "Aadhaar Number",

                    category:
                        "Identity",

                    value:
                        "4567 8912 3456",

                    severity:
                        "Critical",

                    score:
                        30
                },

                {
                    type:
                        "Phone Number",

                    category:
                        "Contact",

                    value:
                        "9876543210",

                    severity:
                        "High",

                    score:
                        15
                },

                {
                    type:
                        "Email Address",

                    category:
                        "Contact",

                    value:
                        "alex.turner@company.com",

                    severity:
                        "Medium",

                    score:
                        10
                }

            ],

            riskScore:
                70,

            riskLevel:
                "HIGH"
        };
    }


    window.scanResults =
        storedData;


    renderSummary(
        storedData
    );

    renderDetectedItems(
        storedData.detectedPII || []
    );

    renderContent(
        storedData.originalText || ""
    );
}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(data) {

    const items =
        data.detectedPII || [];


    const itemCount =
        document.getElementById(
            "itemCount"
        );

    const detectedCount =
        document.getElementById(
            "detectedCount"
        );

    const riskScore =
        document.getElementById(
            "riskScore"
        );

    const riskLevel =
        document.getElementById(
            "riskLevel"
        );

    const description =
        document.getElementById(
            "riskDescription"
        );


    if (itemCount) {

        animateNumber(
            itemCount,
            items.length
        );
    }


    if (detectedCount) {

        detectedCount.textContent =
            `${items.length} ${
                items.length === 1
                    ? "item"
                    : "items"
            }`;
    }


    const score =
        Number(
            data.riskScore || 0
        );


    if (riskScore) {

        riskScore.textContent =
            `${score}%`;
    }


    if (riskLevel) {

        riskLevel.textContent =
            data.riskLevel ||
            "LOW";


        riskLevel.style.color =
            getRiskColor(
                data.riskLevel
            );
    }


    if (description) {

        if (score >= 60) {

            description.textContent =
                "Multiple sensitive information types detected";

        } else if (score >= 30) {

            description.textContent =
                "Some sensitive information needs attention";

        } else if (score > 0) {

            description.textContent =
                "Low-level sensitive information detected";

        } else {

            description.textContent =
                "No sensitive information detected";
        }
    }


    updateRiskRing(
        score
    );
}


/* =========================================================
   RISK RING
========================================================= */

function updateRiskRing(score) {

    const ring =
        document.querySelector(
            ".risk-ring"
        );


    if (!ring) {
        return;
    }


    const degrees =
        Math.min(
            Math.max(score, 0),
            100
        ) * 3.6;


    let color =
        "#10b981";


    if (score >= 60) {

        color =
            "#ef3c58";

    } else if (score >= 30) {

        color =
            "#ed8b38";

    } else if (score > 0) {

        color =
            "#eab308";
    }


    ring.style.background =
        `conic-gradient(
            ${color} 0deg,
            ${color} ${degrees}deg,
            #e9e9f2 ${degrees}deg,
            #e9e9f2 360deg
        )`;
}


/* =========================================================
   DETECTED ITEMS
========================================================= */

function renderDetectedItems(items) {

    const container =
        document.getElementById(
            "detectedList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML = `

            <div class="detected-row">

                <div class="detected-icon">
                    ✓
                </div>

                <div class="detected-info">

                    <strong>
                        No sensitive information found
                    </strong>

                    <span>
                        Your content appears safe to share.
                    </span>

                </div>

            </div>

        `;

        return;
    }


    items.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "detected-row";


            row.innerHTML = `

                <div class="detected-icon">
                    ${getIcon(item.type)}
                </div>


                <div class="detected-info">

                    <strong>
                        ${escapeHtml(item.type)}
                    </strong>

                    <span>
                        ${escapeHtml(item.category || "Sensitive Information")}
                    </span>

                </div>


                <div class="detected-value">
                    ${escapeHtml(item.value)}
                </div>


                <div>

                    <span class="severity ${getSeverityClass(item.severity)}">
                        ${escapeHtml(item.severity)}
                    </span>

                </div>


                <div class="action-text">

                    ${getProtectionText(item.severity)}

                </div>

            `;


            container.appendChild(
                row
            );
        }
    );
}


/* =========================================================
   ICON
========================================================= */

function getIcon(type) {

    const name =
        String(type)
            .toLowerCase();


    if (
        name.includes("phone")
    ) {
        return "☎";
    }


    if (
        name.includes("email")
    ) {
        return "✉";
    }


    if (
        name.includes("card")
    ) {
        return "▣";
    }


    if (
        name.includes("bank")
    ) {
        return "₹";
    }


    if (
        name.includes("aadhaar")
    ) {
        return "♙";
    }


    if (
        name.includes("pan")
    ) {
        return "ID";
    }


    return "!";
}


/* =========================================================
   PROTECTION TEXT
========================================================= */

function getProtectionText(
    severity
) {

    switch (
        String(severity)
            .toLowerCase()
    ) {

        case "critical":
            return "Will be masked";

        case "high":
            return "Will be protected";

        case "medium":
            return "May be masked";

        default:
            return "Review";
    }
}


/* =========================================================
   SEVERITY CLASS
========================================================= */

function getSeverityClass(
    severity
) {

    const value =
        String(severity)
            .toLowerCase();


    if (
        value === "critical"
    ) {
        return "critical";
    }


    if (
        value === "high"
    ) {
        return "high";
    }


    if (
        value === "medium"
    ) {
        return "medium";
    }


    return "low";
}


/* =========================================================
   RISK COLOR
========================================================= */

function getRiskColor(
    level
) {

    switch (
        String(level)
            .toUpperCase()
    ) {

        case "HIGH":
            return "#e4364f";

        case "MEDIUM":
            return "#d97824";

        case "LOW":
            return "#16886e";

        default:
            return "#16886e";
    }
}


/* =========================================================
   CONTENT HIGHLIGHT
========================================================= */

function renderContent(text) {

    const preview =
        document.getElementById(
            "contentPreview"
        );


    if (!preview) {
        return;
    }


    if (!text) {

        preview.textContent =
            "No content scanned.";

        return;
    }


    let safeText =
        escapeHtml(text);


    const items =
        window.scanResults &&
        window.scanResults.detectedPII
            ? window.scanResults.detectedPII
            : [];


    /*
     * Replace sensitive values
     * with highlighted spans.
     */

    items.forEach(
        item => {

            const value =
                escapeHtml(
                    item.value
                );


            if (!value) {
                return;
            }


            const className =
                getHighlightClass(
                    item.severity
                );


            const regex =
                new RegExp(
                    escapeRegExp(value),
                    "g"
                );


            safeText =
                safeText.replace(
                    regex,
                    `<span class="${className}">${value}</span>`
                );
        }
    );


    preview.innerHTML =
        safeText;
}


/* =========================================================
   HIGHLIGHT CLASS
========================================================= */

function getHighlightClass(
    severity
) {

    const value =
        String(severity)
            .toLowerCase();


    if (
        value === "critical"
    ) {
        return "highlight-critical";
    }


    if (
        value === "high"
    ) {
        return "highlight-high";
    }


    return "highlight-medium";
}


/* =========================================================
   SORTING
========================================================= */

function initSorting() {

    const select =
        document.getElementById(
            "sortSelect"
        );


    if (!select) {
        return;
    }


    select.addEventListener(
        "change",
        () => {

            if (
                !window.scanResults
            ) {
                return;
            }


            let items =
                [
                    ...(window.scanResults.detectedPII || [])
                ];


            if (
                select.value ===
                "name"
            ) {

                items.sort(
                    (a, b) =>
                        a.type.localeCompare(
                            b.type
                        )
                );

            } else {

                const weight = {

                    Critical: 4,
                    High: 3,
                    Medium: 2,
                    Low: 1

                };


                items.sort(
                    (a, b) =>
                        (
                            weight[b.severity] || 0
                        ) -
                        (
                            weight[a.severity] || 0
                        )
                );
            }


            renderDetectedItems(
                items
            );
        }
    );
}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const continueBtn =
        document.getElementById(
            "continuePurposeBtn"
        );

    const scanAgain =
        document.getElementById(
            "scanAgainBtn"
        );


    /*
     * Continue → Purpose
     */

    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            () => {

                /*
                 * Keep scan data.
                 * purpose.html will read it.
                 */

                window.location.href =
                    "../html/purpose.html";
            }
        );
    }


    /*
     * Scan again
     */

    if (scanAgain) {

        scanAgain.addEventListener(
            "click",
            () => {

                window.location.href =
                    "../html/scan.html";
            }
        );
    }
}


/* =========================================================
   NUMBER ANIMATION
========================================================= */

function animateNumber(
    element,
    target
) {

    const duration =
        650;

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


        element.textContent =
            Math.floor(
                eased * target
            );


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


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   REGEX ESCAPE
========================================================= */

function escapeRegExp(
    value
) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}


/* =========================================================
   AMBIENT PARTICLES
========================================================= */

function initAmbientCanvas() {
    if (window.initPrivacyGuardAmbientCanvas) {
        window.initPrivacyGuardAmbientCanvas();
    }
}