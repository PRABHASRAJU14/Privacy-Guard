"""Pydantic schemas for PrivacyGuard API.

Includes:
1. Core API Schemas (Scan, Purpose, Protection, Document, History)
2. NoSQL (MongoDB) Schema Modeling: Embedding vs Referencing Relationships (0.2 pts)
"""
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Core API schemas
from backend.schemas.scan import (
    DetectedPIIItem,
    RiskInfo,
    TextScanRequest,
    TextScanResponse,
)
from backend.schemas.purpose import (
    RecommendationItem,
    PurposeAnalyzeRequest,
    PurposeAnalyzeResponse,
)
from backend.schemas.protection import (
    ProtectionReceipt,
    TextProtectRequest,
    TextProtectResponse,
)
from backend.schemas.document import (
    BBox,
    DetectedDocumentItem,
    ImageScanResponse,
    PdfScanResponse,
    DocumentProtectResponse,
)
from backend.schemas.history import (
    HistoryItem,
    HistoryResponse,
    PrivacyStats,
    StatsResponse,
)

# ============================================================================
# NOSQL (MONGODB): EMBEDDING VS REFERENCING RELATIONSHIPS (0.2 pts)
# ============================================================================

# --- 1. EMBEDDED RELATIONSHIP MODELS (1-to-Few Bounded, High Locality) ---
class FindingEmbedded(BaseModel):
    """Sub-document embedded directly inside ScanAuditDocumentEmbedded.
    Represents an individual detected sensitive entity stored within parent document.
    """
    entity_id: str = Field(..., description="Unique entity token")
    entity_type: str = Field(..., description="Entity type: AADHAAR, PAN, PHONE, etc.")
    category: Literal["financial", "government_id", "contact", "biometric"] = Field(
        ..., description="Data sensitivity category"
    )
    raw_preview: str = Field(..., description="Masked preview of detected string")
    risk_weight: int = Field(..., ge=0, le=100, description="Risk impact score (0-100)")
    decision: Literal["KEEP", "PROTECT", "MASK"] = Field(
        ..., description="Minimization policy decision"
    )
    masked_value: str = Field(..., description="Redacted replacement token")


class ReceiptEmbedded(BaseModel):
    """Sub-document embedded directly inside ScanAuditDocumentEmbedded.
    Represents the cryptographic proof of compliance for the scan.
    """
    receipt_hash: str = Field(..., description="SHA-256 tamper-evident digest")
    signature_algorithm: str = Field(default="HMAC-SHA256")
    verified: bool = Field(default=True)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ScanAuditDocumentEmbedded(BaseModel):
    """EMBEDDED RELATIONSHIP PATTERN:
    Embeds findings and receipt directly into one BSON document.
    
    When to use EMBEDDING:
    - 1-to-few bounded relationship (a scan typically has 1-50 entities).
    - Data is always fetched together when viewing a scan report.
    - Requires atomic, ACID-compliant updates within a single document.
    """
    id: str = Field(..., alias="_id", description="MongoDB ObjectId string")
    scan_id: str = Field(..., description="Business scan identifier")
    purpose: str = Field(..., description="Data processing purpose (e.g. expense_reimbursement)")
    overall_risk: int = Field(..., ge=0, le=100)
    risk_level: Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 🌟 EMBEDDED RELATIONSHIPS (1:Few, stored inline in single BSON document)
    findings: List[FindingEmbedded] = Field(
        default_factory=list,
        description="Embedded array of detected sensitive findings"
    )
    receipt: Optional[ReceiptEmbedded] = Field(
        default=None,
        description="Embedded cryptographic proof sub-document"
    )

    class Config:
        populate_by_name = True


# --- 2. REFERENCED RELATIONSHIP MODELS (1-to-Many Unbounded, Decoupled Lifecycle) ---
class UserReference(BaseModel):
    """REFERENCED PARENT ENTITY:
    Independent User document stored in the `users` collection.
    """
    id: str = Field(..., alias="_id", description="MongoDB ObjectId of user")
    username: str = Field(..., min_length=3)
    email: str = Field(..., description="User email address")
    department: str = Field(default="Compliance")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class ScanDocumentReferenced(BaseModel):
    """REFERENCED RELATIONSHIP PATTERN:
    References the user document via `user_id` foreign reference key.
    
    When to use REFERENCING:
    - 1-to-many unbounded relationship (one user can generate thousands of scans).
    - If embedded inside the User document, the 16MB BSON size limit would eventually be breached.
    - Decoupled lifecycles: user profile changes do not trigger rewrites of scan documents.
    """
    id: str = Field(..., alias="_id", description="MongoDB ObjectId of scan")
    scan_id: str
    
    # 🌟 REFERENCED RELATIONSHIP (Points to `users._id`)
    user_id: str = Field(..., description="Foreign key referencing users._id in users collection")
    
    document_id: Optional[str] = Field(None, description="Foreign key referencing documents._id")
    purpose: str
    risk_score: int
    risk_level: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


__all__ = [
    # Core API Schemas
    "DetectedPIIItem",
    "RiskInfo",
    "TextScanRequest",
    "TextScanResponse",
    "RecommendationItem",
    "PurposeAnalyzeRequest",
    "PurposeAnalyzeResponse",
    "ProtectionReceipt",
    "TextProtectRequest",
    "TextProtectResponse",
    "BBox",
    "DetectedDocumentItem",
    "ImageScanResponse",
    "PdfScanResponse",
    "DocumentProtectResponse",
    "HistoryItem",
    "HistoryResponse",
    "PrivacyStats",
    "StatsResponse",
    # Embedding vs referencing relationships (0.2 pts • NoSQL Mongo)
    "FindingEmbedded",
    "ReceiptEmbedded",
    "ScanAuditDocumentEmbedded",
    "UserReference",
    "ScanDocumentReferenced",
]
