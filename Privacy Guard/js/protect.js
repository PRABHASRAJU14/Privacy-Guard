/* =========================================================
   PRIVACYGUARD — PROTECT PAGE JAVASCRIPT
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const PURPOSE_KEY =
    "privacyGuardPurposeData";

const SCAN_KEY =
    "privacyGuardScanData";

const PROTECTED_KEY =
    "privacyGuardProtectedData";


/* =========================================================
   DEFAULT DATA
========================================================= */

const defaultItems = [

    {
        id: "name",
        name: "Full Name",
        example: "Example: Rahul Sharma",
        icon: "👤",
        recommendation: "keep"
    },

    {
        id: "email",
        name: "Email Address",
        example: "Example: rahul@gmail.com",
        icon: "✉",
        recommendation: "keep"
    },

    {
        id: "phone",
        name: "Phone Number",
        example: "Example: +91 9876543210",
        icon: "☎",
        recommendation: "keep"
    },

    {
        id: "aadhaar",
        name: "Aadhaar Number",
        example: "Example: 4567 8912 3456",
        icon: "▣",
        recommendation: "protect"
    },

    {
        id: "pan",
        name: "PAN Number",
        example: "Example: ABCPS1234K",
        icon: "▤",
        recommendation: "protect"
    },

    {
        id: "bank",
        name: "Bank Account Number",
        example: "Example: 1234 5678 9012 3456",
        icon: "🏦",
        recommendation: "protect"
    },

    {
        id: "address",
        name: "Full Address",
        example: "Example: 123, MG Road, Delhi...",
        icon: "📍",
        recommendation: "protect"
    },

    {
        id: "card",
        name: "Credit / Debit Card",
        example: "Example: **** **** **** 4532",
        icon: "▰",
        recommendation: "protect"
    }

];


/* =========================================================
   STATE
========================================================= */

let purposeData = null;

let selectedItems = {};

let items = [];


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadPurpose();

        initializeItems();

        initTheme();

        renderRows();

        updateSummary();

        initButtons();

        initAmbientCanvas();

    }
);


/* =========================================================
   LOAD PURPOSE
========================================================= */

function loadPurpose() {

    try {

        const raw =
            localStorage.getItem(
                PURPOSE_KEY
            );

        if (raw) {

            purposeData =
                JSON.parse(raw);

        }

    } catch (error) {

        console.warn(
            "Could not load purpose data",
            error
        );

    }


    /*
     * Fallback
     */

    if (!purposeData) {

        purposeData = {

            purpose: "job",

            purposeName:
                "Job Application",

            keep: [
                "Name",
                "Email Address",
                "Phone Number"
            ],

            protect: [
                "Aadhaar Number",
                "PAN Number",
                "Bank Account",
                "Credit / Debit Card",
                "Full Address"
            ]

        };

    }


    const purposeName =
        document.getElementById(
            "purposeName"
        );


    if (purposeName) {

        purposeName.textContent =
            purposeData.purposeName ||
            "General Sharing";

    }

}


/* =========================================================
   INITIALIZE ITEMS
========================================================= */

function initializeItems() {

    const detectedItems =
        purposeData &&
        purposeData.scanData &&
        Array.isArray(purposeData.scanData.detectedPII)
            ? purposeData.scanData.detectedPII
            : loadDetectedItems();

    items = detectedItems.map(
        (detected, index) => {
            const name = detected.type || "Sensitive Information";
            let recommendation = matchesPurposeProtect(name)
                ? "protect"
                : "keep";
            let reason = "";

            if (
                purposeData &&
                Array.isArray(purposeData.backendRecommendations) &&
                purposeData.backendRecommendations.length > 0
            ) {
                const normType = (detected.key || name).toLowerCase().replace(/[^a-z0-9]+/g, "_");
                const rec = purposeData.backendRecommendations.find(r =>
                    (r.label && r.label.toLowerCase() === name.toLowerCase()) ||
                    (r.type && r.type.toLowerCase() === normType) ||
                    (detected.value && r.value === detected.value)
                );
                if (rec) {
                    recommendation = rec.decision.toLowerCase();
                    reason = rec.reason || "";
                }
            }

            const item = {
                id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
                name,
                example: `Detected: ${detected.value || "Sensitive value"}`,
                value: detected.value || "",
                category: detected.category || "Sensitive Information",
                severity: detected.severity || "Medium",
                score: Number(detected.score) || 0,
                icon: getItemIcon(name),
                recommendation,
                reason
            };

            selectedItems[item.id] = recommendation;
            return item;
        }
    );

}


function loadDetectedItems() {

    try {
        const raw = localStorage.getItem(SCAN_KEY);
        const scanData = raw ? JSON.parse(raw) : null;
        return scanData && Array.isArray(scanData.detectedPII)
            ? scanData.detectedPII
            : [];
    } catch (_) {
        return [];
    }
}


function getItemIcon(name) {

    const lowerName = name.toLowerCase();

    if (lowerName.includes("email")) return "✉";
    if (lowerName.includes("phone")) return "☎";
    if (lowerName.includes("bank")) return "🏦";
    if (lowerName.includes("card")) return "▰";
    if (lowerName.includes("aadhaar")) return "▣";
    if (lowerName.includes("pan")) return "▤";

    return "!";
}


/* =========================================================
   PURPOSE MATCHING
========================================================= */

function matchesPurposeKeep(
    itemName
) {

    if (
        !purposeData ||
        !purposeData.keep
    ) {
        return false;
    }


    return purposeData.keep.some(
        value =>
            itemName
                .toLowerCase()
                .includes(
                    value
                        .toLowerCase()
                        .replace(
                            "number",
                            ""
                        )
                )
    );
}


function matchesPurposeProtect(
    itemName
) {

    if (
        !purposeData ||
        !purposeData.protect
    ) {
        return false;
    }


    return purposeData.protect.some(
        value =>
            itemName
                .toLowerCase()
                .includes(
                    value
                        .toLowerCase()
                        .replace(
                            "number",
                            ""
                        )
                )
    );
}


/* =========================================================
   RENDER ROWS
========================================================= */

function renderRows() {

    const container =
        document.getElementById(
            "dataRows"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    items.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "data-row";


            const isKeep =
                selectedItems[item.id] ===
                "keep";


            const isProtect =
                selectedItems[item.id] ===
                "protect";


            row.innerHTML = `

                <div class="data-info">

                    <div class="data-icon">
                        ${item.icon}
                    </div>

                    <div>

                        <div class="data-name">
                            ${escapeHtml(item.name)}
                        </div>

                        <div class="data-example">
                            ${escapeHtml(item.example)}
                        </div>

                        ${item.reason ? `
                        <div class="data-reason" style="font-size: 0.78rem; margin-top: 4px; color: var(--accent, #6366f1); opacity: 0.95; line-height: 1.3;">
                            <span style="font-weight: 600;">💡 Purpose Policy:</span> ${escapeHtml(item.reason)}
                        </div>` : ""}

                    </div>

                </div>


                <label class="choice">

                    <input
                        type="radio"
                        name="choice-${item.id}"
                        value="keep"
                        ${isKeep ? "checked" : ""}
                    >

                    <span>
                        Keep
                    </span>

                </label>


                <label class="choice mask">

                    <input
                        type="radio"
                        name="choice-${item.id}"
                        value="protect"
                        ${isProtect ? "checked" : ""}
                    >

                    <span>
                        Mask
                    </span>

                </label>


                <div class="
                    recommendation
                    ${item.recommendation === "protect"
                        ? "mask"
                        : ""}
                " title="${escapeHtml(item.reason || '')}">

                    Recommended<br>
                    to ${item.recommendation === "protect"
                        ? "mask"
                        : "keep"}

                </div>

            `;


            /*
             * Radio events
             */

            row.querySelectorAll(
                `input[name="choice-${item.id}"]`
            ).forEach(
                radio => {

                    radio.addEventListener(
                        "change",
                        () => {

                            selectedItems[item.id] =
                                radio.value;


                            updateSummary();

                            saveProtectedState();

                        }
                    );

                }
            );


            container.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

    const total =
        items.length;


    const keep =
        Object.values(
            selectedItems
        ).filter(
            value =>
                value === "keep"
        ).length;


    const protect =
        Object.values(
            selectedItems
        ).filter(
            value =>
                value === "protect"
        ).length;


    const totalRisk =
        items.reduce(
            (total, item) =>
                total + (Number(item.score) || 0),
            0
        );

    const protectedRisk =
        items.reduce(
            (total, item) =>
                total + (
                    selectedItems[item.id] === "protect"
                        ? Number(item.score) || 0
                        : 0
                ),
            0
        );

    const score = totalRisk > 0
        ? Math.round((protectedRisk / totalRisk) * 100)
        : 100;


    updateElement(
        "totalItems",
        total
    );

    updateElement(
        "keepCount",
        keep
    );

    updateElement(
        "protectCount",
        protect
    );


    updateElement(
        "privacyScore",
        `${score} / 100`
    );

    updateElement(
        "sideScore",
        `${score} / 100`
    );


    const scoreFill =
        document.getElementById(
            "scoreFill"
        );


    const sideScoreFill =
        document.getElementById(
            "sideScoreFill"
        );


    if (scoreFill) {

        scoreFill.style.width =
            `${score}%`;

    }


    if (sideScoreFill) {

        sideScoreFill.style.width =
            `${score}%`;

    }


    const scoreMessage =
        document.getElementById(
            "scoreMessage"
        );


    if (scoreMessage) {

        if (score >= 85) {

            scoreMessage.textContent =
                "Excellent! Your information is well protected.";

        } else if (score >= 65) {

            scoreMessage.textContent =
                "Good! You're sharing safely.";

        } else {

            scoreMessage.textContent =
                "Consider protecting more sensitive information.";

        }

    }

}


/* =========================================================
   SAVE PROTECTED STATE
========================================================= */

function saveProtectedState() {

    const protectedData = {

        purpose:
            purposeData
                ? purposeData.purpose
                : "general",

        purposeName:
            purposeData
                ? purposeData.purposeName
                : "General Sharing",

        items:
            items.map(
                item => ({

                    id:
                        item.id,

                    name:
                        item.name,

                    value:
                        item.value,

                    category:
                        item.category,

                    severity:
                        item.severity,

                    score:
                        item.score,

                    recommendation:
                        item.recommendation,

                    selected:
                        selectedItems[item.id],

                    protected:
                        selectedItems[item.id] ===
                        "protect"

                })
            ),

        scanData:
            purposeData && purposeData.scanData
                ? purposeData.scanData
                : null,

        savedAt:
            new Date().toISOString()

    };


    try {

        localStorage.setItem(
            PROTECTED_KEY,
            JSON.stringify(
                protectedData
            )
        );

    } catch (error) {

        console.warn(
            "Could not save protection state",
            error
        );

    }

}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const previewBtn =
        document.getElementById(
            "previewBtn"
        );


    const continueBtn =
        document.getElementById(
            "continueBtn"
        );


    /*
     * Protect & Preview
     */

    if (previewBtn) {

        previewBtn.addEventListener(
            "click",
            () => {

                saveProtectedState();

                showToast(
                    "🔒 Protection applied — preview ready"
                );

                /*
                 * For now show a visual
                 * confirmation.
                 *
                 * Later you can connect
                 * this to a real preview.
                 */

                previewBtn.innerHTML =
                    "✓ Protection Applied";

                previewBtn.style.background =
                    "#ddf8ef";

                previewBtn.style.color =
                    "#138f72";

                setTimeout(
                    () => {

                        previewBtn.innerHTML =
                            "👁 Protect & Preview";

                        previewBtn.style.background =
                            "";

                        previewBtn.style.color =
                            "";

                    },
                    1800
                );

            }
        );

    }


    /*
     * Continue to Share
     */

    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            () => {

                saveProtectedState();

                showToast(
                    "🛡️ Your protected version is ready"
                );


                setTimeout(
                    () => {

                        /*
                         * Change this to
                         * share.html once
                         * you create that page.
                         */

                        window.location.href =
                            "../html/share.html";

                    },
                    500
                );

            }
        );

    }

}


/* =========================================================
   THEME
========================================================= */

function initTheme() {

    const root =
        document.documentElement;


    const button =
        document.getElementById(
            "themeToggle"
        );


    const icon =
        document.getElementById(
            "themeIcon"
        );


    let savedTheme = null;


    try {

        savedTheme =
            localStorage.getItem(
                "pg_theme_v2"
            );

    } catch (_) {}


    root.setAttribute(
        "data-theme",
        savedTheme ||
        "dark"
    );


    updateIcon();


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const current =
                root.getAttribute(
                    "data-theme"
                );


            const next =
                current === "dark"
                    ? "light"
                    : "dark";


            root.setAttribute(
                "data-theme",
                next
            );


            try {

                localStorage.setItem(
                    "pg_theme_v2",
                    next
                );

            } catch (_) {}


            updateIcon();

        }
    );


    function updateIcon() {

        if (!icon) {
            return;
        }


        icon.textContent =
            root.getAttribute(
                "data-theme"
            ) === "dark"
                ? "☀️"
                : "🌙";

    }

}


/* =========================================================
   AMBIENT PARTICLES
========================================================= */

function initAmbientCanvas() {
    if (window.initPrivacyGuardAmbientCanvas) {
        window.initPrivacyGuardAmbientCanvas();
    }
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message
) {

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
                () => {

                    toast.remove();

                },
                300
            );

        },
        2500
    );

}


/* =========================================================
   HELPER
========================================================= */

function updateElement(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

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