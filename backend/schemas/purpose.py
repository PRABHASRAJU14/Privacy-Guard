"""Schemas for purpose-aware data minimization analysis."""
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.schemas.scan import DetectedPIIItem


class RecommendationItem(BaseModel):
    type: str = Field(..., description="PII type key (e.g. bank_account, upi, email)")
    label: str = Field(..., description="Human-readable label")
    decision: str = Field(..., description="KEEP or PROTECT")
    reason: str = Field(..., description="Deterministic explainability rationale")
    value: Optional[str] = Field(None, description="Matched value")
    severity: Optional[str] = Field(None, description="Severity rating")


class PurposeAnalyzeRequest(BaseModel):
    purpose: str = Field(..., description="Purpose key or name e.g. expense_reimbursement, job_application")
    detected: List[DetectedPIIItem] = Field(default_factory=list, description="Detected PII items from scan")


class PurposeAnalyzeResponse(BaseModel):
    success: bool = True
    purpose: str
    purpose_label: str
    description: str
    keep: List[str]
    protect: List[str]
    recommendations: List[RecommendationItem]
    total_keep: int
    total_protect: int
