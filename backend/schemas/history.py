"""Schemas for scan history and privacy audit statistics."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, NonNegativeInt, ConfigDict


class AuditMetadata(BaseModel):
    """Structured model for audit_events.metadata_json.
    Supports flexible entity category counts while enforcing type safety (e.g., {'fin': 2, 'id': 1}).
    """
    model_config = ConfigDict(extra="allow")

    category_counts: Dict[str, NonNegativeInt] = Field(
        default_factory=dict,
        description="Flexible mapping of category shortcodes to entity count (e.g. {'fin': 2, 'id': 1})",
    )
    exposure_reduction: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Percentage of privacy exposure reduced by minimization policy (0-100%)",
    )
    raw_entity_count: NonNegativeInt = Field(
        default=0,
        description="Total number of detected PII items before redaction",
    )


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
