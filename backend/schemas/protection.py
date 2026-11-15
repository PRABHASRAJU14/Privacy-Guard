"""Schemas for text protection and redaction."""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from backend.schemas.scan import DetectedPIIItem


class ProtectionReceipt(BaseModel):
    """Integrity verification receipt for protected output."""
    algorithm: str = "SHA-256"
    hash: str


class TextProtectRequest(BaseModel):
    text: str = Field(..., description="Original text to redact")
    detected: List[DetectedPIIItem] = Field(default_factory=list, description="List of detected PII items")
    decisions: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary mapping PII type or identifier to 'KEEP' or 'PROTECT'",
    )
    purpose: Optional[str] = Field(None, description="Optional purpose of sharing (e.g. expense_reimbursement)")
    scan_id: Optional[int] = Field(None, description="Optional scan ID from earlier text scan")


class TextProtectResponse(BaseModel):
    success: bool = True
    original_text: str
    protected_text: str
    protected_count: int
    kept_count: int
    safe_to_share: bool
    scan_id: Optional[int] = None
    purpose: Optional[str] = None
    risk_before: Optional[int] = None
    risk_after: Optional[int] = None
    exposure_reduction: Optional[float] = None
    protection_receipt: Optional[ProtectionReceipt] = None
