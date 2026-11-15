"""Schemas for scan requests and responses."""
from typing import List, Optional
from pydantic import BaseModel, Field


class DetectedPIIItem(BaseModel):
    type: str = Field(..., description="Machine-readable type key (e.g. aadhaar, pan, phone)")
    label: str = Field(..., description="Human-readable label (e.g. Aadhaar Number)")
    category: str = Field(..., description="Category (Identity, Contact, Financial)")
    value: str = Field(..., description="Detected raw value")
    start: int = Field(..., description="Start character offset in original text")
    end: int = Field(..., description="End character offset in original text")
    severity: str = Field(..., description="Severity level: CRITICAL, HIGH, MEDIUM, LOW")
    risk_weight: int = Field(..., description="Base risk weight contribution")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    valid: bool = Field(..., description="Whether checksum or structural validation passed")
    explanation: Optional[str] = Field(None, description="Brief explanation of sensitivity")


class RiskInfo(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Normalized risk score (0 to 100)")
    level: str = Field(..., description="SAFE, LOW, MEDIUM, HIGH")
    critical_count: int = Field(0, description="Count of critical items")
    high_count: int = Field(0, description="Count of high severity items")
    medium_count: int = Field(0, description="Count of medium severity items")
    low_count: int = Field(0, description="Count of low severity items")
    has_identity: bool = Field(False, description="Identity identifiers present")
    has_contact: bool = Field(False, description="Contact identifiers present")
    has_financial: bool = Field(False, description="Financial identifiers present")
    combination_risk_applied: bool = Field(False, description="Combination penalty applied")


class TextScanRequest(BaseModel):
    text: str = Field(..., description="Text content to scan for PII")


class TextScanResponse(BaseModel):
    success: bool = True
    risk: RiskInfo
    detected: List[DetectedPIIItem]
    total_detected: int
    scan_id: Optional[int] = None
