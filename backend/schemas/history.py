"""Schemas for scan history and privacy audit statistics."""
from typing import List, Optional
from pydantic import BaseModel, Field


class HistoryItem(BaseModel):
    id: int
    timestamp: str
    input_type: str
    purpose: Optional[str] = None
    risk_before: int
    risk_after: int
    detected_count: int
    protected_count: int
    kept_count: int
    protection_percentage: float
    safe_to_share: bool
    output_file_type: Optional[str] = None
    protection_receipt_hash: Optional[str] = None


class HistoryResponse(BaseModel):
    success: bool = True
    history: List[HistoryItem]


class PrivacyStats(BaseModel):
    total_scans: int
    text_scans: int
    image_scans: int
    pdf_scans: int
    protected_documents: int
    total_sensitive_items_detected: int
    total_sensitive_items_protected: int
    leaks_averted: int = Field(
        ...,
        description="Scans where sensitive data was detected AND at least one item was protected",
    )
    average_risk_before: float
    average_risk_after: float
    average_exposure_reduction: float


class StatsResponse(BaseModel):
    success: bool = True
    stats: PrivacyStats
