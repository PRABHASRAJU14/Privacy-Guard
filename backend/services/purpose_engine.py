"""Deterministic Purpose-Aware Data Minimization Engine for PrivacyGuard.
Maps business and sharing contexts to granular KEEP and PROTECT policies.
"""
from typing import Dict, Any, List, Optional
from backend.schemas.scan import DetectedPIIItem
from backend.schemas.purpose import RecommendationItem, PurposeAnalyzeResponse

# Normalized purpose definitions
PURPOSE_POLICIES: Dict[str, Dict[str, Any]] = {
    "expense_reimbursement": {
        "label": "Expense Reimbursement",
        "description": "Retain proof of expenditure while masking sensitive account details and unrelated finances.",
        "keep": ["merchant", "amount", "transaction_date", "transaction_id"],
        "protect": [
            "bank_account", "upi", "balance", "unrelated_transactions",
            "card", "pan", "aadhaar", "phone", "email", "ifsc"
        ],
        "reasons": {
            "bank_account": "Bank account number is not required to verify the reimbursement payment.",
            "upi": "UPI ID is not required to verify the reimbursement payment.",
            "balance": "Available balance reveals unrelated financial information.",
            "unrelated_transactions": "Unrelated transactions are outside the reimbursement purpose.",
            "card": "Payment card numbers are not necessary to verify expense claims.",
            "aadhaar": "Aadhaar number is unnecessary for business expense reimbursement.",
            "pan": "Tax identifier is not required to confirm travel or vendor payments.",
            "phone": "Personal phone number is not required to approve this receipt.",
            "email": "Personal email address is unnecessary on the transaction proof.",
            "ifsc": "Bank routing codes are not needed for standard payment verification.",
        },
    },
    "bank_verification": {
        "label": "Bank Verification",
        "description": "Keep essential banking identifiers while protecting unrelated identity credentials.",
        "keep": ["bank_account", "ifsc", "name", "amount", "merchant"],
        "protect": [
            "card", "aadhaar", "pan", "upi", "phone", "balance",
            "unrelated_transactions", "email"
        ],
        "reasons": {
            "card": "Credit/debit card numbers should not be exposed during account routing checks.",
            "aadhaar": "Universal identity number is not required for routine bank branch verification.",
            "pan": "PAN is unnecessary for basic bank account validation.",
            "upi": "UPI handle is redundant when account and IFSC are already present.",
            "balance": "Account balance is confidential and not required to verify account ownership.",
            "unrelated_transactions": "Prior unrelated transactions must not be disclosed to verifiers.",
        },
    },
    "job_application": {
        "label": "Job Application",
        "description": "Retain candidate contact information while shielding financial and national IDs.",
        "keep": ["name", "email", "phone"],
        "protect": [
            "aadhaar", "pan", "bank_account", "card", "full_address",
            "upi", "balance", "unrelated_transactions", "ifsc"
        ],
        "reasons": {
            "aadhaar": "National ID number is not needed prior to formal employment onboarding.",
            "pan": "Tax identification is not required during the interview or candidate evaluation phase.",
            "bank_account": "Bank account information is not required for the initial job application.",
            "card": "Financial card details have no relevance to employment applications.",
            "upi": "Payment handles are irrelevant to employment screening.",
            "full_address": "Exact residential address is unnecessary during preliminary application stages.",
            "balance": "Financial holdings are private and irrelevant to job qualifications.",
        },
    },
    "age_verification": {
        "label": "Age Verification",
        "description": "Establish age eligibility without exposing identity numbers or financial information.",
        "keep": ["date_of_birth", "age"],
        "protect": [
            "aadhaar", "pan", "phone", "email", "bank_account",
            "card", "full_address", "upi", "balance", "unrelated_transactions"
        ],
        "reasons": {
            "aadhaar": "Aadhaar number is not required merely to verify age.",
            "pan": "Tax number should not be exposed for proof of age.",
            "phone": "Personal contact details are unnecessary to establish age threshold.",
            "bank_account": "Financial data is completely irrelevant to age validation.",
            "full_address": "Residential address is outside the scope of age checks.",
        },
    },
    "address_verification": {
        "label": "Address Verification",
        "description": "Establish residence while protecting financial and national identity credentials.",
        "keep": ["full_address", "pincode", "name"],
        "protect": [
            "aadhaar", "pan", "bank_account", "card", "upi",
            "balance", "unrelated_transactions", "date_of_birth"
        ],
        "reasons": {
            "aadhaar": "National biometric ID is not required when utility or address proof suffices.",
            "pan": "Financial tax identifier is not required for residence confirmation.",
            "bank_account": "Bank account numbers are not necessary to verify delivery or residential address.",
            "card": "Payment card details are unrelated to address proof.",
        },
    },
    "college_admission": {
        "label": "College Admission",
        "description": "Retain academic candidate details while protecting sensitive financial data.",
        "keep": ["name", "email", "phone", "student_id"],
        "protect": [
            "bank_account", "card", "aadhaar", "pan", "upi",
            "balance", "unrelated_transactions"
        ],
        "reasons": {
            "bank_account": "Bank account information is unnecessary for academic admission review.",
            "card": "Credit/debit card numbers must never be included in academic records.",
            "aadhaar": "Biometric ID should be protected from broad administrative circulation.",
            "pan": "Tax identifier is not required for educational admission evaluation.",
        },
    },
    "general_sharing": {
        "label": "General Sharing",
        "description": "Minimize information to the conversational baseline, shielding identity and financial data.",
        "keep": ["name", "email"],
        "protect": [
            "aadhaar", "pan", "bank_account", "card", "phone",
            "upi", "balance", "unrelated_transactions", "ifsc"
        ],
        "reasons": {
            "aadhaar": "Universal ID is strictly confidential and unsafe for casual sharing.",
            "pan": "PAN is an essential tax credential that should not be shared casually.",
            "bank_account": "Bank details should be masked unless a direct transfer is agreed.",
            "card": "Credit/debit card details must never be transmitted via general messaging.",
            "phone": "Masking personal phone prevents unsolicited calls and contact scraping.",
            "upi": "UPI ID reveals banking identity and should be withheld in general chats.",
        },
    },
    "public_posting": {
        "label": "Public Posting",
        "description": "Public content has high exposure risk; protect all personal and financial identifiers by default.",
        "keep": ["name"],
        "protect": [
            "aadhaar", "pan", "bank_account", "card", "phone",
            "email", "upi", "balance", "unrelated_transactions", "ifsc",
            "merchant", "amount", "transaction_id", "transaction_date"
        ],
        "reasons": {
            "aadhaar": "This information is a direct identifier and is dangerous for public sharing.",
            "pan": "This tax identifier is a target for identity theft and must not be posted publicly.",
            "bank_account": "This information is a direct financial identifier and is unsafe for public sharing.",
            "card": "Payment card credentials must never appear on public platforms.",
            "phone": "Personal phone numbers on public forums invite persistent spam and harassment.",
            "email": "Email addresses in public domains are harvested by malicious scrapers.",
            "upi": "Financial payment handles should not be exposed to the public.",
            "balance": "Financial liquidity details must remain strictly private.",
            "unrelated_transactions": "Financial history must never be published openly.",
        },
    },
    "loan_application": {
        "label": "Loan Application",
        "description": "Provide required financial declarations while safeguarding unrelated transactions and cards.",
        "keep": ["name", "pan", "bank_account", "ifsc", "amount", "merchant"],
        "protect": [
            "card", "aadhaar", "upi", "unrelated_transactions"
        ],
        "reasons": {
            "card": "Credit card numbers and CVV are not required for loan underwriting.",
            "aadhaar": "Aadhaar number should be masked according to RBI guidelines for lending.",
            "upi": "Personal UPI handle is redundant when verified bank statements are provided.",
            "unrelated_transactions": "Discretionary personal expenses should not be exposed without purpose.",
        },
    },
    "custom": {
        "label": "Other Purpose",
        "description": "Apply standard baseline protection for critical identity and financial credentials.",
        "keep": ["name"],
        "protect": [
            "aadhaar", "pan", "bank_account", "card", "upi",
            "balance", "unrelated_transactions"
        ],
        "reasons": {
            "aadhaar": "Universal identifier protected as a default safety measure.",
            "pan": "Tax identifier protected to prevent unauthorized exposure.",
            "bank_account": "Bank account protected to safeguard personal funds.",
            "card": "Card numbers protected against unauthorized charges.",
            "upi": "Payment handles protected by default.",
        },
    },
}

# Alias mapping for flexible user input
PURPOSE_ALIASES = {
    "expense": "expense_reimbursement",
    "expense_reimbursement": "expense_reimbursement",
    "expense reimbursement": "expense_reimbursement",
    "reimbursement": "expense_reimbursement",
    "bank": "bank_verification",
    "bank_verification": "bank_verification",
    "bank verification": "bank_verification",
    "job": "job_application",
    "job_application": "job_application",
    "job application": "job_application",
    "employment": "job_application",
    "age": "age_verification",
    "age_verification": "age_verification",
    "age verification": "age_verification",
    "address": "address_verification",
    "address_verification": "address_verification",
    "address verification": "address_verification",
    "college": "college_admission",
    "college_admission": "college_admission",
    "college admission": "college_admission",
    "admission": "college_admission",
    "general": "general_sharing",
    "general_sharing": "general_sharing",
    "general sharing": "general_sharing",
    "public": "public_posting",
    "public_posting": "public_posting",
    "public posting": "public_posting",
    "loan": "loan_application",
    "loan_application": "loan_application",
    "loan application": "loan_application",
    "other": "custom",
    "custom": "custom",
}


def normalize_purpose_key(raw_purpose: str) -> str:
    """Normalize input purpose string to a canonical policy key."""
    cleaned = raw_purpose.strip().lower()
    return PURPOSE_ALIASES.get(cleaned, "custom")


def analyze_purpose(
    purpose: str, detected: List[DetectedPIIItem]
) -> PurposeAnalyzeResponse:
    """Analyze detected PII against the specified purpose policy.
    Returns recommendations (KEEP / PROTECT) with explainability rationales.
    """
    canon_key = normalize_purpose_key(purpose)
    policy = PURPOSE_POLICIES.get(canon_key, PURPOSE_POLICIES["custom"])

    policy_keep = set(policy["keep"])
    policy_protect = set(policy["protect"])
    reasons_map = policy.get("reasons", {})

    recommendations: List[RecommendationItem] = []
    keep_list: List[str] = []
    protect_list: List[str] = []

    for item in detected:
        t = item.type.lower()

        # Decision rule:
        # If explicitly in keep and not in protect -> KEEP
        # If in protect -> PROTECT
        # Otherwise, default to PROTECT for High/Critical, KEEP for Low
        if t in policy_keep and t not in policy_protect:
            decision = "KEEP"
            reason = f"Necessary evidence or information required for {policy['label']}."
        else:
            decision = "PROTECT"
            reason = reasons_map.get(
                t,
                f"This {item.label} is unnecessary for the purpose of {policy['label']}."
            )

        if decision == "KEEP":
            keep_list.append(item.label)
        else:
            protect_list.append(item.label)

        recommendations.append(
            RecommendationItem(
                type=item.type,
                label=item.label,
                decision=decision,
                reason=reason,
                value=item.value,
                severity=item.severity,
            )
        )

    return PurposeAnalyzeResponse(
        success=True,
        purpose=canon_key,
        purpose_label=policy["label"],
        description=policy["description"],
        keep=list(dict.fromkeys(keep_list)),
        protect=list(dict.fromkeys(protect_list)),
        recommendations=recommendations,
        total_keep=len([r for r in recommendations if r.decision == "KEEP"]),
        total_protect=len([r for r in recommendations if r.decision == "PROTECT"]),
    )
