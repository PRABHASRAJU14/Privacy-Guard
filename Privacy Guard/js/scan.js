/* =========================================================
   PRIVACYGUARD — SCAN PAGE
========================================================= */


/* =========================================================
   GLOBAL
========================================================= */

const STORAGE_KEY = "privacyGuardScanData";


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initTextInput();

        initSamples();

        initFileUpload();

        initScanner();

        initClearButton();

        initAmbientCanvas();

    }
);


/* =========================================================
   TEXT INPUT
========================================================= */

function initTextInput() {

    const textarea =
        document.getElementById(
            "scanText"
        );

    const counter =
        document.getElementById(
            "characterCount"
        );


    if (!textarea) {
        return;
    }


    function updateCounter() {

        if (counter) {

            counter.textContent =
                textarea.value.length;
        }
    }


    textarea.addEventListener(
        "input",
        updateCounter
    );


    updateCounter();
}


/* =========================================================
   SAMPLE CONTENT
========================================================= */

function initSamples() {

    const textarea =
        document.getElementById(
            "scanText"
        );


    if (!textarea) {
        return;
    }


    const samples = {

        expense:
            "Merchant: Uber India\nAmount: ₹2,850\nDate: 05 Sep 2026\nTransaction ID: TXN84927361\nBank Account: 4821 0098 7712\nUPI ID: rahul@bank\nAvailable Balance: ₹74,820\n\nOther Transactions:\nAmazon -₹4,299\nSwiggy -₹620\nElectricity -₹2,140",

        aadhaar:
            "Hi sir, my name is Rahul Kumar. My Aadhaar number is 4567 8912 3456 and my phone number is 9876543210.",


        payment:
            "Please send the payment receipt to alex.turner@company.com. Bank account: 123456789012, IFSC: HDFC0001234. Card: 4532-8910-2345-6789.",


        clean:
            "Hi team, let us meet tomorrow at 10 AM to discuss the product roadmap."
    };


    document
        .querySelectorAll(
            ".sample-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const type =
                        button.dataset.sample;


                    if (
                        samples[type]
                    ) {

                        textarea.value =
                            samples[type];


                        textarea.dispatchEvent(
                            new Event("input")
                        );


                        showToast(
                            "Example loaded."
                        );
                    }
                }
            );

        });
}


/* =========================================================
   FILE UPLOAD
========================================================= */

function initFileUpload() {

    const input =
        document.getElementById(
            "fileInput"
        );

    const browse =
        document.getElementById(
            "browseBtn"
        );

    const dropZone =
        document.getElementById(
            "dropZone"
        );

    const textarea =
        document.getElementById(
            "scanText"
        );


    if (
        !input ||
        !browse ||
        !dropZone
    ) {
        return;
    }


    browse.addEventListener(
        "click",
        () => {
            input.click();
        }
    );


    input.addEventListener(
        "change",
        () => {

            if (
                input.files &&
                input.files.length
            ) {

                handleFile(
                    input.files[0]
                );
            }
        }
    );


    [
        "dragenter",
        "dragover"
    ].forEach(eventName => {

        dropZone.addEventListener(
            eventName,
            event => {

                event.preventDefault();

                dropZone.classList.add(
                    "drag-over"
                );
            }
        );
    });


    [
        "dragleave",
        "drop"
    ].forEach(eventName => {

        dropZone.addEventListener(
            eventName,
            event => {

                event.preventDefault();

                dropZone.classList.remove(
                    "drag-over"
                );
            }
        );
    });


    dropZone.addEventListener(
        "drop",
        event => {

            const files =
                event.dataTransfer.files;


            if (
                files &&
                files.length
            ) {

                handleFile(
                    files[0]
                );
            }
        }
    );


    function handleFile(file) {

        const allowedTypes = [
            "txt",
            "csv",
            "pdf",
            "doc",
            "docx",
            "xlsx",
            "png",
            "jpg",
            "jpeg"
        ];


        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (
            !allowedTypes.includes(
                extension
            )
        ) {

            showToast(
                "Unsupported file type."
            );

            return;
        }


        showToast(
            `📄 ${file.name} selected`
        );


        /*
         * TXT and CSV can be read directly
         * in this frontend prototype.
         *
         * PDF/DOCX/images are stored as
         * file metadata for now.
         *
         * Real OCR/document extraction
         * will connect to the FastAPI backend.
         */

        if (
            extension === "txt" ||
            extension === "csv"
        ) {

            const reader =
                new FileReader();


            reader.onload =
                event => {

                    textarea.value =
                        event.target.result;


                    textarea.dispatchEvent(
                        new Event("input")
                    );
                };


            reader.readAsText(file);

        } else {

            textarea.value =
                `[Uploaded file: ${file.name}]\n\nFile type: ${extension.toUpperCase()}\n\nPrivacyGuard will process this document during scanning.`;

            textarea.dispatchEvent(
                new Event("input")
            );
        }


        /*
         * Keep file metadata and active upload reference.
         */
        window.selectedUploadFile = file;

        try {
            localStorage.setItem(
                "privacyGuardFileName",
                file.name
            );
        } catch (_) {}

    }
}


/* =========================================================
   CLEAR
========================================================= */

function initClearButton() {

    const button =
        document.getElementById(
            "clearBtn"
        );

    const textarea =
        document.getElementById(
            "scanText"
        );

    if (
        !button ||
        !textarea
    ) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            window.selectedUploadFile = null;
            textarea.value = "";

            textarea.dispatchEvent(
                new Event("input")
            );

            showToast(
                "Content cleared."
            );
        }
    );
}


/* =========================================================
   SCANNER
========================================================= */

function initScanner() {

    const button =
        document.getElementById(
            "scanButton"
        );

    const textarea =
        document.getElementById(
            "scanText"
        );

    const overlay =
        document.getElementById(
            "scanOverlay"
        );

    const progressBar =
        document.getElementById(
            "loadingProgressBar"
        );

    const status =
        document.getElementById(
            "loadingStatus"
        );


    if (
        !button ||
        !textarea ||
        !overlay
    ) {
        return;
    }


    let scanning =
        false;


    button.addEventListener(
        "click",
        async () => {

            if (scanning) {
                return;
            }


            const text =
                textarea.value.trim();


            if (!text) {

                showToast(
                    "Please paste some content or upload a file first."
                );

                textarea.focus();

                return;
            }


            scanning = true;


            overlay.classList.add(
                "active"
            );


            const stages = [

                {
                    progress: 20,
                    text:
                        "Reading your content..."
                },

                {
                    progress: 45,
                    text:
                        "Detecting sensitive information..."
                },

                {
                    progress: 70,
                    text:
                        "Calculating privacy risk..."
                },

                {
                    progress: 90,
                    text:
                        "Preparing your privacy report..."
                },

                {
                    progress: 100,
                    text:
                        "Scan complete ✓"
                }

            ];


            for (
                const stage of stages
            ) {

                await delay(450);


                if (progressBar) {

                    progressBar.style.width =
                        `${stage.progress}%`;
                }


                if (status) {

                    status.textContent =
                        stage.text;
                }
            }


            /*
             * Analyze content via FastAPI backend with local fallback
             * Routes image -> /api/scan/image, PDF -> /api/scan/pdf, text -> /api/scan/text
             */
            let results = null;
            let backendEntities = null;
            let fileType = "text";
            let fileId = null;
            let extractedText = text;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const activeFile = window.selectedUploadFile;
                const fileExt = activeFile ? activeFile.name.split(".").pop().toLowerCase() : "";

                let endpoint = "http://127.0.0.1:8000/api/scan/text";
                let fetchOptions = {};

                if (activeFile && ["png", "jpg", "jpeg"].includes(fileExt)) {
                    endpoint = "http://127.0.0.1:8000/api/scan/image";
                    fileType = "image";
                    const formData = new FormData();
                    formData.append("file", activeFile);
                    fetchOptions = {
                        method: "POST",
                        body: formData,
                        signal: controller.signal
                    };
                } else if (activeFile && fileExt === "pdf") {
                    endpoint = "http://127.0.0.1:8000/api/scan/pdf";
                    fileType = "pdf";
                    const formData = new FormData();
                    formData.append("file", activeFile);
                    fetchOptions = {
                        method: "POST",
                        body: formData,
                        signal: controller.signal
                    };
                } else {
                    fileType = "text";
                    fetchOptions = {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text }),
                        signal: controller.signal
                    };
                }

                const response = await fetch(endpoint, fetchOptions);
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.success && Array.isArray(data.detected)) {
                        backendEntities = data.detected;
                        fileId = data.file_id || null;
                        if (data.text) {
                            extractedText = data.text;
                        }
                        results = {
                            items: data.detected.map(d => ({
                                type: d.label || d.type,
                                category: d.category,
                                value: d.value,
                                severity: d.severity.charAt(0) + d.severity.slice(1).toLowerCase(),
                                score: d.risk_weight || 15,
                                start: d.start,
                                end: d.end,
                                valid: d.valid,
                                bbox: d.bbox || null,
                                page: d.page || null,
                                explanation: d.explanation
                            })),
                            riskScore: data.risk.score,
                            riskLevel: data.risk.level
                        };
                        showToast(`✓ Document processed (${fileType.toUpperCase()})`);
                    }
                } else {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.detail || `Server returned error status ${response.status}`;
                    if (fileType === "image" || fileType === "pdf") {
                        overlay.classList.remove("active");
                        scanning = false;
                        showToast(`⚠️ OCR Error: ${errMsg}`);
                        alert(`Image Scanning Error:\n\n${errMsg}\n\nPlease check the OCR setup or download official 64-bit Tesseract OCR.`);
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn("Backend scanning unreachable, checking file type:", apiErr);
                if (fileType === "image" || fileType === "pdf") {
                    overlay.classList.remove("active");
                    scanning = false;
                    showToast("⚠️ Could not reach OCR service.");
                    alert("OCR Service Unreachable:\n\nPlease make sure the PrivacyGuard backend server is running at http://127.0.0.1:8000 via run.bat.");
                    return;
                }
            }

            if (!results) {
                results = detectPII(text);
            }

            /* Save everything for the result page. */

            const scanData = {
                originalText: extractedText,
                detectedPII: results.items,
                backendEntities: backendEntities,
                riskScore: results.riskScore,
                riskLevel: results.riskLevel,
                fileType: fileType,
                fileId: fileId,
                scannedAt: new Date().toISOString(),
                fileName: window.selectedUploadFile ? window.selectedUploadFile.name : getStoredFileName()
            };

            try {
                localStorage.removeItem(
                    "privacyGuardPurposeData"
                );
                localStorage.removeItem(
                    "privacyGuardProtectedData"
                );
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(
                        scanData
                    )
                );

            } catch (error) {

                console.warn(
                    "Could not save scan data:",
                    error
                );
            }


            await delay(500);


            /*
             * Redirect
             */

            window.location.href =
                "../html/result.html";

        }
    );
}


/* =========================================================
   PII DETECTION
========================================================= */

function detectPII(text) {

    const items = [];


    /*
     * Aadhaar
     */

    const aadhaarRegex =
        /\b\d{4}\s\d{4}\s\d{4}\b/g;


    const aadhaarMatches =
        text.match(
            aadhaarRegex
        ) || [];


    aadhaarMatches.forEach(
        value => {

            items.push({

                type:
                    "Aadhaar Number",

                category:
                    "Identity",

                value:
                    value,

                severity:
                    "Critical",

                score:
                    30
            });
        }
    );


    /*
     * PAN
     */

    const panRegex =
        /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;


    const panMatches =
        text.match(
            panRegex
        ) || [];


    panMatches.forEach(
        value => {

            items.push({

                type:
                    "PAN Card",

                category:
                    "Identity",

                value:
                    value,

                severity:
                    "Critical",

                score:
                    25
            });
        }
    );


    /*
     * Phone
     */

    const phoneRegex =
        /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g;


    const phoneMatches =
        text.match(
            phoneRegex
        ) || [];


    phoneMatches.forEach(
        value => {

            items.push({

                type:
                    "Phone Number",

                category:
                    "Contact",

                value:
                    value,

                severity:
                    "High",

                score:
                    15
            });
        }
    );


    /*
     * Email
     */

    const emailRegex =
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;


    const emailMatches =
        text.match(
            emailRegex
        ) || [];


    emailMatches.forEach(
        value => {

            items.push({

                type:
                    "Email Address",

                category:
                    "Contact",

                value:
                    value,

                severity:
                    "Medium",

                score:
                    10
            });
        }
    );


    /*
     * Credit / Debit Card
     */

    const cardRegex =
        /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;


    const cardMatches =
        text.match(
            cardRegex
        ) || [];


    cardMatches.forEach(
        value => {

            /*
             * Avoid treating Aadhaar
             * as a card number.
             */

            if (
                !aadhaarMatches.includes(
                    value
                )
            ) {

                items.push({

                    type:
                        "Credit / Debit Card",

                    category:
                        "Financial",

                    value:
                        value,

                    severity:
                        "Critical",

                    score:
                        35
                });
            }
        }
    );


    /*
     * Bank Account
     */

    const accountRegex =
        /\b\d{9,18}\b/g;


    const accountMatches =
        text.match(
            accountRegex
        ) || [];


    accountMatches.forEach(
        value => {

            /*
             * Don't duplicate phone,
             * Aadhaar or card values.
             */

            const alreadyDetected =
                items.some(
                    item =>
                        item.value === value
                );


            if (
                !alreadyDetected &&
                /\b(?:account|bank|a\/c)\b/i.test(
                    text
                )
            ) {

                items.push({

                    type:
                        "Bank Account",

                    category:
                        "Financial",

                    value:
                        value,

                    severity:
                        "Critical",

                    score:
                        30
                });
            }
        }
    );


    /*
     * Remove duplicate entities
     */

    const uniqueItems =
        Array.from(
            new Map(
                items.map(
                    item =>
                        [
                            `${item.type}-${item.value}`,
                            item
                        ]
                )
            ).values()
        );


    /*
     * Calculate project-defined risk score.
     *
     * These weights are demo/project
     * scoring values, not official standards.
     */

    let score = 0;


    uniqueItems.forEach(
        item => {
            score += item.score;
        }
    );


    /*
     * Combination risk.
     *
     * Multiple identity attributes
     * together increase exposure.
     */

    const hasIdentity =
        uniqueItems.some(
            item =>
                item.type ===
                "Aadhaar Number" ||
                item.type ===
                "PAN Card"
        );


    const hasContact =
        uniqueItems.some(
            item =>
                item.type ===
                "Phone Number" ||
                item.type ===
                "Email Address"
        );


    if (
        hasIdentity &&
        hasContact
    ) {

        score += 15;
    }


    score =
        Math.min(
            score,
            100
        );


    let riskLevel =
        "LOW";


    if (score >= 60) {

        riskLevel =
            "HIGH";

    } else if (score >= 30) {

        riskLevel =
            "MEDIUM";

    } else if (score > 0) {

        riskLevel =
            "LOW";
    }


    return {

        items:
            uniqueItems,

        riskScore:
            score,

        riskLevel:
            riskLevel

    };
}


/* =========================================================
   FILE NAME
========================================================= */

function getStoredFileName() {

    try {

        return (
            localStorage.getItem(
                "privacyGuardFileName"
            ) || null
        );

    } catch (_) {

        return null;
    }
}


/* =========================================================
   DELAY
========================================================= */

function delay(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
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
                "translateY(8px)";

            toast.style.transition =
                ".3s";


            setTimeout(
                () => toast.remove(),
                300
            );

        },
        2600
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