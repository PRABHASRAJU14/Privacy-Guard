/* =========================================================
   PRIVACYGUARD — SHARE PAGE JAVASCRIPT
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const PURPOSE_KEY =
    "privacyGuardPurposeData";

const PROTECTED_KEY =
    "privacyGuardProtectedData";


/* =========================================================
   STATE
========================================================= */

let protectedData = null;

let purposeName =
    "Job Application";


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadData();

        updatePage();

        initButtons();

        initAmbientCanvas();

    }
);


/* =========================================================
   LOAD DATA
========================================================= */

function loadData() {

    try {

        const protectedRaw =
            localStorage.getItem(
                PROTECTED_KEY
            );

        if (protectedRaw) {

            protectedData =
                JSON.parse(
                    protectedRaw
                );

        }


        const purposeRaw =
            localStorage.getItem(
                PURPOSE_KEY
            );

        if (purposeRaw) {

            const purpose =
                JSON.parse(
                    purposeRaw
                );

            if (
                purpose &&
                purpose.purposeName
            ) {

                purposeName =
                    purpose.purposeName;

            }

        }

    } catch (error) {

        console.warn(
            "PrivacyGuard data could not be loaded.",
            error
        );

    }


    if (
        protectedData &&
        protectedData.purposeName
    ) {

        purposeName =
            protectedData.purposeName;

    }

}


/* =========================================================
   UPDATE PAGE
========================================================= */

function updatePage() {

    const purposeElement =
        document.getElementById(
            "purposeName"
        );


    if (purposeElement) {

        purposeElement.textContent =
            purposeName;

    }


    /*
     * Calculate counts from
     * Protect page selections.
     */

    let keepCount = 3;

    let protectCount = 5;


    if (
        protectedData &&
        Array.isArray(
            protectedData.items
        )
    ) {

        keepCount =
            protectedData.items.filter(
                item =>
                    item.selected ===
                    "keep"
            ).length;


        protectCount =
            protectedData.items.filter(
                item =>
                    item.selected ===
                    "protect"
            ).length;

    }


    const maskedCount =
        document.getElementById(
            "maskedCount"
        );


    if (maskedCount) {

        maskedCount.textContent =
            protectCount;

    }


    /*
     * Privacy score.
     */

    const totalRisk =
        protectedData && Array.isArray(protectedData.items)
            ? protectedData.items.reduce(
                (total, item) =>
                    total + (Number(item.score) || 0),
                0
            )
            : 0;

    const protectedRisk =
        protectedData && Array.isArray(protectedData.items)
            ? protectedData.items.reduce(
                (total, item) =>
                    total + (
                        item.protected
                            ? Number(item.score) || 0
                            : 0
                    ),
                0
            )
            : 0;

    const score = totalRisk > 0
        ? Math.round((protectedRisk / totalRisk) * 100)
        : 100;


    const scoreElement =
        document.getElementById(
            "privacyScore"
        );


    if (scoreElement) {

        scoreElement.textContent =
            `${score} / 100`;

    }


    /*
     * Update summary text.
     */

    const summaryItems =
        document.querySelectorAll(
            ".summary-item strong"
        );


    if (
        summaryItems.length >= 2
    ) {

        summaryItems[0].textContent =
            keepCount;

        summaryItems[1].textContent =
            protectCount;

    }

    renderPreviews();

}


/* =========================================================
   BUTTONS
========================================================= */

function initButtons() {

    const copyBtn =
        document.getElementById(
            "copyBtn"
        );


    const downloadBtn =
        document.getElementById(
            "downloadBtn"
        );


    const shareBtn =
        document.getElementById(
            "shareBtn"
        );


    /*
     * COPY
     */

    if (copyBtn) {

        copyBtn.addEventListener(
            "click",
            async () => {

                const safeText =
                    getSafeText();


                try {

                    await navigator.clipboard.writeText(
                        safeText
                    );

                    copyBtn.innerHTML =
                        "✓ Safe Version Copied";

                    showToast(
                        "✓ Safe version copied to clipboard"
                    );

                } catch (error) {

                    showToast(
                        "Copy is not available in this browser."
                    );

                }

            }
        );

    }


    /*
     * DOWNLOAD
     */

    if (downloadBtn) {

        downloadBtn.addEventListener(
            "click",
            () => {

                if (backendDownloadUrl) {
                    const link = document.createElement("a");
                    link.href = backendDownloadUrl;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    showToast("↓ Protected document downloaded");
                    return;
                }

                const safeText =
                    getSafeText();

                const blob =
                    new Blob(
                        [safeText],
                        {
                            type:
                                "text/plain"
                        }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href = url;

                link.download =
                    "PrivacyGuard-Safe-Version.txt";

                document.body.appendChild(
                    link
                );

                link.click();

                link.remove();

                URL.revokeObjectURL(
                    url
                );

                showToast(
                    "↓ Safe version downloaded"
                );

            }
        );

    }


    /*
     * SHARE
     */

    if (shareBtn) {

        shareBtn.addEventListener(
            "click",
            async () => {

                const safeText =
                    getSafeText();


                /*
                 * Native Web Share
                 * when available.
                 */

                if (
                    navigator.share
                ) {

                    try {

                        await navigator.share({

                            title:
                                "PrivacyGuard Safe Version",

                            text:
                                safeText

                        });


                        showToast(
                            "🛡️ Shared safely"
                        );


                    } catch (error) {

                        /*
                         * User cancelled.
                         */

                    }

                } else {

                    try {

                        await navigator.clipboard.writeText(
                            safeText
                        );

                        showToast(
                            "🛡️ Safe version copied — ready to share"
                        );

                    } catch (error) {

                        showToast(
                            "Your safe version is ready to share."
                        );

                    }

                }

            }
        );

    }

}


/* =========================================================
   SAFE TEXT
========================================================= */

let backendProtectedText = null;
let backendDownloadUrl = null;

function getSafeText() {

    const originalText =
        getOriginalText();

    const protectedContent =
        backendProtectedText || maskProtectedValues(originalText);

    return `${protectedContent}

Protected by PrivacyGuard.
Purpose: ${purposeName}
"Share Smart. Stay Private."
`;

}


function getOriginalText() {

    if (
        protectedData &&
        protectedData.scanData &&
        protectedData.scanData.originalText
    ) {
        return protectedData.scanData.originalText;
    }

    return "No content scanned yet.";
}


function maskProtectedValues(text) {

    let safeText = text;

    const protectedItems =
        protectedData && Array.isArray(protectedData.items)
            ? protectedData.items.filter(item => item.protected)
            : [];

    protectedItems.forEach(item => {

        if (!item.value) {
            return;
        }

        const escapedValue =
            item.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        safeText = safeText.replace(
            new RegExp(escapedValue, "g"),
            maskValue(item.value, item.name)
        );
    });

    return safeText;
}


function maskValue(value, name) {

    const lowerName =
        String(name).toLowerCase();

    if (lowerName.includes("card")) {
        return `•••• •••• •••• ${value.replace(/\D/g, "").slice(-4)}`;
    }

    if (lowerName.includes("bank")) {
        return `••••••••${value.replace(/\D/g, "").slice(-4)}`;
    }

    if (lowerName.includes("phone")) {
        return `••••••••${value.replace(/\D/g, "").slice(-2)}`;
    }

    if (lowerName.includes("aadhaar")) {
        return `•••• •••• ${value.replace(/\D/g, "").slice(-4)}`;
    }

    if (lowerName.includes("pan")) {
        return "••••••••••";
    }

    if (lowerName.includes("upi")) {
        const parts = value.split("@");
        return `••••••••@${parts[1] || "bank"}`;
    }

    if (lowerName.includes("balance")) {
        const hasDollar = value.includes("$");
        return hasDollar ? "$••••••" : "₹••••••";
    }

    if (lowerName.includes("ifsc")) {
        return "•••••••••••";
    }

    if (lowerName.includes("email")) {
        const parts = value.split("@");
        return `${parts[0].charAt(0)}•••@${parts[1] || "protected"}`;
    }

    return "••••••••";
}


function renderPreviews() {

    const previews =
        document.querySelectorAll(
            ".preview-box .message-content"
        );

    if (previews.length < 2) {
        return;
    }

    const original = getOriginalText();
    previews[0].textContent = original;
    previews[1].textContent = backendProtectedText || maskProtectedValues(original);

    // Asynchronously call backend /api/protect/text for exact deterministic slicing
    fetchBackendProtection();
}


async function fetchBackendProtection() {
    try {
        const rawScan = localStorage.getItem("privacyGuardScanData");
        const scanData = rawScan ? JSON.parse(rawScan) : null;
        const original = getOriginalText();
        if (!original || original === "No content scanned yet.") return;

        let detected = [];
        if (scanData && Array.isArray(scanData.backendEntities) && scanData.backendEntities.length > 0) {
            detected = scanData.backendEntities;
        } else if (protectedData && Array.isArray(protectedData.items)) {
            detected = protectedData.items.map(item => ({
                type: (item.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                label: item.name,
                category: item.category || "Identity",
                value: item.value || "",
                start: 0,
                end: 0,
                severity: (item.severity || "MEDIUM").toUpperCase(),
                risk_weight: item.score || 15,
                confidence: 0.95,
                valid: true,
                explanation: ""
            }));
        }

        const decisions = {};
        if (protectedData && Array.isArray(protectedData.items)) {
            protectedData.items.forEach(it => {
                const dec = (it.selected === "protect" || it.protected) ? "PROTECT" : "KEEP";
                const normName = (it.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
                decisions[normName] = dec;
                decisions[it.name] = dec;
                if (it.value) decisions[it.value] = dec;
            });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const fileType = (scanData && scanData.fileType) || "text";
        const fileId = (scanData && scanData.fileId) || null;

        if (fileType === "image" && fileId) {
            const formData = new FormData();
            formData.append("file_id", fileId);
            formData.append("decisions", JSON.stringify(decisions));
            formData.append("detected", JSON.stringify(detected));

            const resp = await fetch("http://127.0.0.1:8000/api/protect/image", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success) {
                    applyProtectionStats(data);
                    showToast("✓ Image protected with pixel redaction");
                }
            }
        } else if (fileType === "pdf" && fileId) {
            const formData = new FormData();
            formData.append("file_id", fileId);
            formData.append("decisions", JSON.stringify(decisions));
            formData.append("detected", JSON.stringify(detected));

            const resp = await fetch("http://127.0.0.1:8000/api/protect/pdf", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success) {
                    applyProtectionStats(data);
                    showToast("✓ PDF protected — underlying text eradicated");
                }
            }
        } else {
            const resp = await fetch("http://127.0.0.1:8000/api/protect/text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: original,
                    detected: detected,
                    decisions: decisions,
                    purpose: purposeName
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success) {
                    applyProtectionStats(data);
                    showToast("✓ Text protected according to purpose policy");
                }
            }
        }
    } catch (err) {
        console.warn("Backend protection offline, client fallback active:", err);
    }
}

function applyProtectionStats(data) {
    if (!data) return;

    if (data.download_url) {
        backendDownloadUrl = "http://127.0.0.1:8000" + data.download_url;
    }
    if (data.protected_text) {
        backendProtectedText = data.protected_text;
        const previews = document.querySelectorAll(".preview-box .message-content");
        if (previews.length >= 2) {
            previews[1].textContent = data.protected_text;
        }
    }

    if (data.protection_receipt && data.protection_receipt.hash) {
        const hashDisplay = document.getElementById("receiptHashDisplay");
        if (hashDisplay) {
            hashDisplay.textContent = `SHA-256: ${data.protection_receipt.hash}`;
            hashDisplay.title = data.protection_receipt.hash;
        }
    }

    if (data.exposure_reduction != null) {
        const expEl = document.getElementById("exposureReductionStat");
        if (expEl) {
            expEl.textContent = `${Math.round(data.exposure_reduction)}%`;
        }
    }

    if (data.kept_count != null) {
        const keptEl = document.getElementById("keptCount");
        if (keptEl) keptEl.textContent = data.kept_count;
    }

    if (data.protected_count != null) {
        const maskedEl = document.getElementById("maskedCount");
        if (maskedEl) maskedEl.textContent = data.protected_count;
    }

    if (data.risk_after != null) {
        const scoreEl = document.getElementById("privacyScore");
        if (scoreEl) {
            const score = Math.max(80, Math.min(100, 100 - data.risk_after));
            scoreEl.textContent = `${score} / 100`;
        }
    }
}


/* =========================================================
   AMBIENT CANVAS
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