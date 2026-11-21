"""MongoDB Schema Modeling: Embedding vs. Referencing Relationships (0.2 pts)

Demonstrates the two core schema design patterns in MongoDB / NoSQL:
1. EMBEDDED RELATIONSHIP (Denormalized / Document-embedded):
   - Used for 1-to-Few relationships where sub-entities are always queried together with the parent.
   - Example: Detected PII items and cryptographic integrity receipts embedded within a ScanAuditDocument.
   - Benefits: Atomic single-document reads/writes, high spatial locality, zero joins.

2. REFERENCED RELATIONSHIP (Normalized / Document-referenced):
   - Used for 1-to-Many unbounded relationships or independently managed entities.
   - Example: Scan documents referencing a User document by user_id.
   - Benefits: Avoids MongoDB 16MB BSON document limit, prevents write amplification, decouples lifecycles.
"""
from typing import List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# 1. EMBEDDED RELATIONSHIP MODELS (1-to-Few, Atomic Access)
# ============================================================================

class FindingEmbedded(BaseModel):
    """Sub-document embedded directly inside ScanAuditDocumentEmbedded.
    Represents an individual detected sensitive entity.
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
    """EMBEDDED PATTERN:
    Embeds findings and receipt directly into one BSON document.
    
    When to use:
    - 1-to-few relationship (a scan typically has 1-50 entities).
    - Data is always fetched together when viewing a scan report.
    - Requires atomic, ACID-compliant updates within a single document.
    """
    id: str = Field(..., alias="_id", description="MongoDB ObjectId string")
    scan_id: str = Field(..., description="Business scan identifier")
    purpose: str = Field(..., description="Data processing purpose (e.g. expense_reimbursement)")
    overall_risk: int = Field(..., ge=0, le=100)
    risk_level: Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 🌟 EMBEDDED RELATIONSHIPS (1:Few, stored inline in BSON)
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
        json_schema_extra = {
            "example": {
                "_id": "6739bc4f89d31a54b9821ef1",
                "scan_id": "scan-901",
                "purpose": "expense_reimbursement",
                "overall_risk": 85,
                "risk_level": "HIGH",
                "findings": [
                    {
                        "entity_id": "ent-01",
                        "entity_type": "BANK_ACCOUNT",
                        "category": "financial",
                        "raw_preview": "SBIN0001234",
                        "risk_weight": 30,
                        "decision": "PROTECT",
                        "masked_value": "[REDACTED BANK]"
                    }
                ],
                "receipt": {
                    "receipt_hash": "a1b2c3d4e5f6...",
                    "verified": True
                }
            }
        }


# ============================================================================
# 2. REFERENCED RELATIONSHIP MODELS (1-to-Many Unbounded, Decoupled Lifecycle)
# ============================================================================

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
    """REFERENCED PATTERN:
    References the user document via `user_id` foreign reference key.
    
    When to use:
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
        json_schema_extra = {
            "example": {
                "_id": "6739bc4f89d31a54b9821ef2",
                "scan_id": "scan-902",
                "user_id": "6739bc4f89d31a54b9821000",
                "purpose": "bank_verification",
                "risk_score": 75,
                "risk_level": "HIGH"
            }
        }
