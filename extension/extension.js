document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".extension-close").forEach(closeButton => {
        closeButton.addEventListener("click", () => {
            window.location.href = "../html/landing.html";
        });

        closeButton.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                window.location.href = "../html/landing.html";
            }
        });
    });


    /* =====================================================
       ELEMENTS
    ====================================================== */

    const protectButton =
        document.getElementById("protectButton");

    const ignoreButton =
        document.getElementById("ignoreButton");

    const sendButton =
        document.getElementById("sendButton");

    const purposeSelect =
        document.getElementById("purposeSelect");

    const bankScreenshot =
        document.getElementById("bankScreenshot");

    const attachmentCard =
        document.querySelector(".attachment-card");

    const fileStatus =
        document.getElementById("fileStatus");

    const warningTitle =
        document.getElementById("warningTitle");

    const warningDescription =
        document.getElementById("warningDescription");

    const exposureCount =
        document.getElementById("exposureCount");

    const resultTitle =
        document.getElementById("resultTitle");

    const resultText =
        document.getElementById("resultText");

    const privacyFooter =
        document.getElementById("privacyFooter");

    const removeFile =
        document.getElementById("removeFile");

    const toast =
        document.getElementById("toast");

    const toastTitle =
        document.getElementById("toastTitle");

    const toastMessage =
        document.getElementById("toastMessage");


    /* =====================================================
       TOAST
    ====================================================== */

    function showToast(title, message) {

        toastTitle.textContent = title;

        toastMessage.textContent = message;

        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

    }


    /* =====================================================
       PROTECT BUTTON
    ====================================================== */

    protectButton.addEventListener("click", () => {


        /* ---------------------------------------------
           Change the actual screenshot
        --------------------------------------------- */

        bankScreenshot.classList.add("protected");

        attachmentCard.classList.add("protected");


        /* ---------------------------------------------
           Global protected state
        --------------------------------------------- */

        document.body.classList.add("protected");


        /* ---------------------------------------------
           Warning
        --------------------------------------------- */

        warningTitle.textContent =
            "Screenshot protected";

        warningDescription.textContent =
            "Unnecessary financial information has been masked.";

        exposureCount.textContent =
            "0";


        /* ---------------------------------------------
           Result
        --------------------------------------------- */

        resultTitle.textContent =
            "Safe to share";

        resultText.textContent =
            "The payment proof remains visible while unnecessary financial details are protected.";


        /* ---------------------------------------------
           Attachment status
        --------------------------------------------- */

        fileStatus.textContent =
            "🛡 Sensitive details protected";


        /* ---------------------------------------------
           Button
        --------------------------------------------- */

        protectButton.innerHTML =
            "✓ Protected & Ready";


        /* ---------------------------------------------
           Footer
        --------------------------------------------- */

        privacyFooter.textContent =
            "✓ Proof retained • Private financial details protected";


        /* ---------------------------------------------
           Toast
        --------------------------------------------- */

        showToast(
            "Screenshot protected",
            "Account, UPI, balance and unrelated transactions were masked."
        );

    });


    /* =====================================================
       IGNORE
    ====================================================== */

    ignoreButton.addEventListener("click", () => {

        showToast(
            "Sharing without protection",
            "You chose to send the original screenshot."
        );

    });


    /* =====================================================
       SEND
    ====================================================== */

    sendButton.addEventListener("click", () => {

        const protectedState =
            document.body.classList.contains("protected");


        if (!protectedState) {

            showToast(
                "PrivacyGuard warning",
                "Sensitive financial information is still exposed."
            );

            return;

        }


        showToast(
            "Email ready to send",
            "The protected payment proof is ready to share."
        );

    });


    /* =====================================================
       PURPOSE CHANGE
    ====================================================== */

    purposeSelect.addEventListener("change", () => {

        const purpose =
            purposeSelect.value;


        if (
            purpose ===
            "Expense Reimbursement"
        ) {

            warningDescription.textContent =
                "Your screenshot contains financial information that may not be needed for this purpose.";

            resultText.textContent =
                "Keep the payment evidence and protect unrelated financial details.";

        }


        else if (
            purpose ===
            "Bank Verification"
        ) {

            warningDescription.textContent =
                "Some financial identifiers may be relevant. Review before sharing.";

            resultText.textContent =
                "PrivacyGuard will help you decide what information is actually required.";

        }


        else if (
            purpose ===
            "Loan Application"
        ) {

            warningDescription.textContent =
                "Financial information may be relevant, but unrelated details can still be protected.";

            resultText.textContent =
                "Share the financial information required for the application, not everything in the screenshot.";

        }


        else {

            warningDescription.textContent =
                "Review the information before sharing.";

            resultText.textContent =
                "PrivacyGuard recommends minimizing unnecessary personal information.";

        }


        /* Reset protected state if purpose changes */

        bankScreenshot.classList.remove("protected");

        attachmentCard.classList.remove("protected");

        document.body.classList.remove("protected");


        exposureCount.textContent =
            "7";

        warningTitle.textContent =
            "Sensitive information detected";

        fileStatus.textContent =
            "🛡 Scanned by PrivacyGuard";

        protectButton.innerHTML =
            "🛡 Protect & Continue";


        showToast(
            "Purpose updated",
            purpose
        );

    });


    /* =====================================================
       REMOVE ATTACHMENT
    ====================================================== */

    removeFile.addEventListener("click", () => {

        attachmentCard.style.opacity = "0";

        attachmentCard.style.transform =
            "scale(.95)";

        setTimeout(() => {

            attachmentCard.style.display =
                "none";

        }, 300);


        showToast(
            "Attachment removed",
            "The screenshot was removed from the message."
        );

    });


    /* =====================================================
       DETECTED DATA HOVER
    ====================================================== */

    const dataRows =
        document.querySelectorAll(".data-row");


    dataRows.forEach(row => {

        row.addEventListener("mouseenter", () => {

            row.style.transform =
                "translateX(2px)";

        });


        row.addEventListener("mouseleave", () => {

            row.style.transform =
                "translateX(0)";

        });

    });


});