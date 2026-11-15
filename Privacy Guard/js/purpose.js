/* =========================================================
   PRIVACYGUARD — PURPOSE PAGE JS
========================================================= */

const SCAN_STORAGE_KEY =
    "privacyGuardScanData";

const PURPOSE_STORAGE_KEY =
    "privacyGuardPurposeData";

if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);
window.addEventListener("pageshow", () => {
    window.scrollTo(0, 0);
});


/* =========================================================
   PURPOSE POLICIES
========================================================= */

const purposePolicies = {

    expense: {

        title: "Expense Reimbursement",

        description:
            "Keep the information needed to verify the expense. Protect unrelated financial details.",

        keep: [
            "Merchant",
            "Amount",
            "Transaction Date",
            "Transaction ID"
        ],

        protect: [
            "Bank Account",
            "UPI ID",
            "Available Balance",
            "Other Transactions",
            "Credit / Debit Card",
            "Aadhaar Number",
            "PAN Number"
        ]
    },

    job: {

        title: "Job Application",

        description:
            "Information normally needed for contacting you and evaluating your application.",

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
    },


    age: {

        title: "Age Verification",

        description:
            "The goal is to verify age without exposing unnecessary identity information.",

        keep: [
            "Date of Birth",
            "Age"
        ],

        protect: [
            "Aadhaar Number",
            "PAN Number",
            "Phone Number",
            "Bank Account",
            "Credit / Debit Card",
            "Full Address"
        ]
    },


    address: {

        title: "Address Verification",

        description:
            "Only information needed to establish your residence should remain visible.",

        keep: [
            "Address",
            "PIN / ZIP Code"
        ],

        protect: [
            "Aadhaar Number",
            "PAN Number",
            "Bank Account",
            "Credit / Debit Card",
            "Date of Birth"
        ]
    },


    bank: {

        title: "Bank Verification",

        description:
            "Bank-related information may be necessary, while unrelated identity data can be protected.",

        keep: [
            "Bank Account",
            "IFSC Code",
            "Account Holder Name"
        ],

        protect: [
            "Aadhaar Number",
            "PAN Number",
            "Credit / Debit Card",
            "Date of Birth",
            "Phone Number"
        ]
    },


    college: {

        title: "College Admission",

        description:
            "Keep information relevant to student identification and admission.",

        keep: [
            "Name",
            "Email Address",
            "Phone Number",
            "Student ID"
        ],

        protect: [
            "Bank Account",
            "Credit / Debit Card",
            "Aadhaar Number",
            "Unnecessary Financial Information"
        ]
    },


    general: {

        title: "General Sharing",

        description:
            "Keep only the information needed for the specific conversation.",

        keep: [
            "Name",
            "Email Address"
        ],

        protect: [
            "Aadhaar Number",
            "PAN Number",
            "Bank Account",
            "Credit / Debit Card",
            "Date of Birth",
            "Full Address",
            "Phone Number"
        ]
    },


    public: {

        title: "Public Posting",

        description:
            "Public content has a much higher exposure risk, so personal identifiers should normally be protected.",

        keep: [
            "Public Name / Display Name"
        ],

        protect: [
            "Aadhaar Number",
            "PAN Number",
            "Bank Account",
            "Credit / Debit Card",
            "Phone Number",
            "Email Address",
            "Date of Birth",
            "Full Address"
        ]
    },


    custom: {

        title: "Other Purpose",

        description:
            "PrivacyGuard will help you review the information before sharing.",

        keep: [
            "Information directly required for your purpose"
        ],

        protect: [
            "Aadhaar Number",
            "PAN Number",
            "Bank Account",
            "Credit / Debit Card",
            "Other unnecessary identifiers"
        ]
    },

    expense: {
        title: "Expense Reimbursement",
        description: "Retain proof of expenditure while masking sensitive account details and unrelated finances.",
        keep: [
            "Merchant",
            "Total Amount",
            "Transaction Date",
            "Transaction ID"
        ],
        protect: [
            "Bank Account",
            "UPI ID",
            "Available Balance",
            "Other Transactions",
            "Credit / Debit Card",
            "Aadhaar Number",
            "PAN Number"
        ]
    },

    loan: {
        title: "Loan Application",
        description: "Keep financial status and identity proof while protecting unrelated day-to-day transactions.",
        keep: [
            "Bank Account",
            "PAN Number",
            "Available Balance",
            "Full Address"
        ],
        protect: [
            "Credit / Debit Card",
            "UPI ID",
            "Other Transactions"
        ]
    }

};


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initPurposeSelection();

        initContinueButton();

        initAmbientCanvas();

        restorePreviousPurpose();

    }
);


/* =========================================================
   PURPOSE SELECTION
========================================================= */

function initPurposeSelection() {

    // Ensure Expense Reimbursement and Loan Application exist in the grid
    const grid = document.querySelector(".purpose-grid");
    if (grid && !grid.querySelector('[data-purpose="expense"]')) {
        const customBtn = grid.querySelector('[data-purpose="custom"]');

        const expenseBtn = document.createElement("button");
        expenseBtn.className = "purpose-option";
        expenseBtn.setAttribute("data-purpose", "expense");
        expenseBtn.innerHTML = `
            <div class="purpose-icon green">🧾</div>
            <div class="purpose-info">
                <strong>Expense Reimbursement</strong>
                <span>Uber, travel or business invoice proof</span>
            </div>
            <div class="purpose-check">✓</div>
        `;

        const loanBtn = document.createElement("button");
        loanBtn.className = "purpose-option";
        loanBtn.setAttribute("data-purpose", "loan");
        loanBtn.innerHTML = `
            <div class="purpose-icon blue">💳</div>
            <div class="purpose-info">
                <strong>Loan Application</strong>
                <span>Bank loans, EMI or credit verification</span>
            </div>
            <div class="purpose-check">✓</div>
        `;

        if (customBtn) {
            grid.insertBefore(expenseBtn, customBtn);
            grid.insertBefore(loanBtn, customBtn);
        } else {
            grid.appendChild(expenseBtn);
            grid.appendChild(loanBtn);
        }
    }

    const buttons =
        document.querySelectorAll(
            ".purpose-option"
        );

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const purpose =
                        button.getAttribute(
                            "data-purpose"
                        );

                    if (
                        button.classList.contains(
                            "selected"
                        )
                    ) {
                        clearPurposeSelection();
                        return;
                    }

                    selectPurpose(
                        purpose,
                        button
                    );

                }
            );

        }
    );
}


/* =========================================================
   SELECT PURPOSE
========================================================= */

async function selectPurpose(
    purpose,
    selectedButton
) {

    const basePolicy =
        purposePolicies[purpose];

    if (!basePolicy) {
        return;
    }

    const policy = {
        ...getEffectivePolicy(basePolicy)
    };

    /*
     * Remove selection from all cards.
     */
    document
        .querySelectorAll(
            ".purpose-option"
        )
        .forEach(
            button => {
                button.classList.remove(
                    "selected"
                );
            }
        );

    /*
     * Highlight selected card.
     */
    selectedButton.classList.add(
        "selected"
    );

    /*
     * Update selected text.
     */
    const selectedText =
        document.getElementById(
            "selectedPurposeText"
        );

    if (selectedText) {
        selectedText.textContent =
            policy.title;
    }

    /*
     * Render initial recommendation immediately
     */
    renderRecommendation(
        policy
    );

    /*
     * Enable Continue button.
     */
    const continueBtn =
        document.getElementById(
            "continueProtectBtn"
        );

    if (continueBtn) {
        continueBtn.disabled =
            false;
    }

    /*
     * Save initial state
     */
    savePurposeData(
        purpose,
        policy
    );

    showToast(
        `🎯 Purpose selected: ${policy.title}`
    );

    /*
     * Call backend /api/analyze/purpose for deterministic minimization
     */
    try {
        const rawScan = localStorage.getItem(SCAN_STORAGE_KEY);
        const scanData = rawScan ? JSON.parse(rawScan) : null;
        let detected = [];
        if (scanData && Array.isArray(scanData.backendEntities) && scanData.backendEntities.length > 0) {
            detected = scanData.backendEntities;
        } else if (scanData && Array.isArray(scanData.detectedPII)) {
            detected = scanData.detectedPII.map(item => ({
                type: item.key || (item.type || "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                label: item.type || item.name || "Item",
                category: item.category || "Identity",
                value: item.value || "",
                start: item.start || 0,
                end: item.end || 0,
                severity: (item.severity || "MEDIUM").toUpperCase(),
                risk_weight: item.score || 15,
                confidence: 0.95,
                valid: true,
                explanation: item.explanation || ""
            }));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const resp = await fetch("http://127.0.0.1:8000/api/analyze/purpose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                purpose: purpose,
                detected: detected
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const apiResult = await resp.json();
            if (apiResult && apiResult.success) {
                if (Array.isArray(apiResult.recommendations) && apiResult.recommendations.length > 0) {
                    policy.backendRecommendations = apiResult.recommendations;
                }
                if (Array.isArray(apiResult.keep) && apiResult.keep.length > 0) {
                    policy.keep = apiResult.keep;
                }
                if (Array.isArray(apiResult.protect) && apiResult.protect.length > 0) {
                    policy.protect = apiResult.protect;
                }
                renderRecommendation(policy);
                savePurposeData(purpose, policy);
            }
        }
    } catch (apiErr) {
        console.warn("Backend purpose minimization unreachable, staying with local rules:", apiErr);
    }
}


function clearPurposeSelection() {

    document
        .querySelectorAll(
            ".purpose-option"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );

    const selectedText =
        document.getElementById(
            "selectedPurposeText"
        );

    if (selectedText) {
        selectedText.textContent = "None";
    }

    const container =
        document.getElementById(
            "recommendationContent"
        );

    if (container) {
        container.innerHTML = `
            <div class="empty-recommendation">
                <div class="empty-icon">
                    🎯
                </div>
                <div>
                    <strong>
                        Choose your purpose
                    </strong>
                    <span>
                        We'll identify the minimum
                        information required.
                    </span>
                </div>
            </div>
        `;
    }

    const continueBtn =
        document.getElementById(
            "continueProtectBtn"
        );

    if (continueBtn) {
        continueBtn.disabled = true;
    }

    try {
        localStorage.removeItem(
            PURPOSE_STORAGE_KEY
        );
    } catch (_) {}

    window.privacyGuardPurpose = null;

    showToast(
        "Purpose cleared. Select one to continue."
    );
}


/* =========================================================
   RENDER RECOMMENDATION
========================================================= */

function renderRecommendation(
    policy
) {

    const container =
        document.getElementById(
            "recommendationContent"
        );

    if (!container) {
        return;
    }

    // If backend recommendations with explainability reasons are available, render them
    if (Array.isArray(policy.backendRecommendations) && policy.backendRecommendations.length > 0) {
        let html = `<div class="recommendation-list">`;
        policy.backendRecommendations.forEach(rec => {
            const isKeep = rec.decision === "KEEP";
            html += `
                <div class="rec-item" style="align-items: flex-start;">
                    <div class="rec-left" style="align-items: flex-start;">
                        <div class="rec-dot ${isKeep ? 'keep' : 'protect'}" style="margin-top: 2px;">
                            ${isKeep ? '✓' : '🔒'}
                        </div>
                        <div>
                            <span class="rec-name" style="font-weight: 600;">
                                ${escapeHtml(rec.label)}
                            </span>
                            <div class="rec-reason" style="font-size: 0.76rem; opacity: 0.8; margin-top: 3px; line-height: 1.35;">
                                ${escapeHtml(rec.reason)}
                            </div>
                        </div>
                    </div>
                    <span class="rec-status ${isKeep ? 'keep' : 'protect'}">
                        ${rec.decision}
                    </span>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    let html = `
        <div class="recommendation-list">
    `;

    /*
     * KEEP
     */
    policy.keep.forEach(
        item => {
            html += `
                <div class="rec-item">
                    <div class="rec-left">
                        <div class="rec-dot keep">
                            ✓
                        </div>
                        <span class="rec-name">
                            ${escapeHtml(item)}
                        </span>
                    </div>
                    <span class="rec-status keep">
                        KEEP
                    </span>
                </div>
            `;
        }
    );

    /*
     * PROTECT
     */
    policy.protect.forEach(
        item => {
            html += `
                <div class="rec-item">
                    <div class="rec-left">
                        <div class="rec-dot protect">
                            🔒
                        </div>
                        <span class="rec-name">
                            ${escapeHtml(item)}
                        </span>
                    </div>
                    <span class="rec-status protect">
                        PROTECT
                    </span>
                </div>
            `;
        }
    );

    html += `
        </div>
    `;

    container.innerHTML =
        html;
}


/* =========================================================
   SAVE PURPOSE
========================================================= */

function savePurposeData(
    purpose,
    policy
) {

    let scanData = null;

    try {
        const raw =
            localStorage.getItem(
                SCAN_STORAGE_KEY
            );

        if (raw) {
            scanData =
                JSON.parse(raw);
        }
    } catch (_) {}

    const purposeData = {
        purpose: purpose,
        purposeName: policy.title,
        keep: policy.keep,
        protect: policy.protect,
        backendRecommendations: policy.backendRecommendations || null,
        selectedAt: new Date().toISOString(),
        scanData: scanData
    };


    try {

        localStorage.setItem(
            PURPOSE_STORAGE_KEY,
            JSON.stringify(
                purposeData
            )
        );

    } catch (error) {

        console.warn(
            "Unable to save purpose data",
            error
        );
    }


    window.privacyGuardPurpose =
        purposeData;
}


/* =========================================================
   RESTORE PURPOSE
========================================================= */

function restorePreviousPurpose() {

    let saved = null;


    try {

        const raw =
            localStorage.getItem(
                PURPOSE_STORAGE_KEY
            );


        if (raw) {

            saved =
                JSON.parse(raw);
        }

    } catch (_) {}


    if (!saved || !saved.purpose) {
        return;
    }


    const button =
        document.querySelector(
            `.purpose-option[data-purpose="${saved.purpose}"]`
        );


    if (button) {

        selectPurpose(
            saved.purpose,
            button
        );
    }
}


/* =========================================================
   CONTINUE TO PROTECT
========================================================= */

function initContinueButton() {

    const button =
        document.getElementById(
            "continueProtectBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            if (
                button.disabled
            ) {
                return;
            }


            /*
             * The purpose data is
             * already stored in
             * localStorage.
             */

            showToast(
                "🛡️ Preparing your protection plan..."
            );


            setTimeout(
                () => {

                    window.location.href =
                        "../html/protect.html";

                },
                500
            );

        }
    );
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
   ESCAPE HTML
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
   AMBIENT PARTICLES
========================================================= */

function initAmbientCanvas() {
    if (window.initPrivacyGuardAmbientCanvas) {
        window.initPrivacyGuardAmbientCanvas();
    }
}


function getEffectivePolicy(policy) {

    let scanData = null;

    try {
        const raw =
            localStorage.getItem(
                SCAN_STORAGE_KEY
            );

        if (raw) {
            scanData = JSON.parse(raw);
        }
    } catch (_) {}

    const detectedNames =
        new Set(
            (scanData && scanData.detectedPII || [])
                .map(item => item.type)
        );

    if (!detectedNames.size) {
        return policy;
    }

    const detected = value =>
        Array.from(detectedNames).some(
            name => namesMatch(name, value)
        );

    return {
        ...policy,
        keep: policy.keep.filter(detected),
        protect: policy.protect.filter(detected)
    };
}


function namesMatch(first, second) {

    const normalize = value =>
        String(value)
            .toLowerCase()
            .replace(/number|card|account|address|\/|-/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const left = normalize(first);
    const right = normalize(second);

    return left.includes(right) || right.includes(left);
}