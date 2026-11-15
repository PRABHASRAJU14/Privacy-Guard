"""Schemas for multimodal document and image processing."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.schemas.scan import RiskInfo
from backend.schemas.protection import ProtectionReceipt


class BBox(BaseModel):
    left: float = Field(..., description="X coordinate of top-left corner")
    top: float = Field(..., description="Y coordinate of top-left corner")
    width: float = Field(..., description="Width of bounding box")
    height: float = Field(..., description="Height of bounding box")


class DetectedDocumentItem(BaseModel):
    type: str = Field(..., description="Machine-readable type key")
    label: str = Field(..., description="Human-readable label")
    category: str = Field(..., description="Category (Identity, Contact, Financial, Transaction)")
    value: str = Field(..., description="Detected value")
    start: int = Field(0, description="Start character index")
    end: int = Field(0, description="End character index")
    severity: str = Field(..., description="Severity level")
    risk_weight: int = Field(..., description="Risk weight")
    confidence: float = Field(0.95, description="Confidence score")
    valid: bool = Field(True, description="Validation passed")
    page: Optional[int] = Field(None, description="Page number for PDF documents")
    bbox: Optional[BBox] = Field(None, description="Pixel or point bounding box")
    decision: Optional[str] = Field("PROTECT", description="Recommended decision: KEEP or PROTECT")
    explanation: Optional[str] = Field(None, description="Explainability rationale")


class ImageScanResponse(BaseModel):
    success: bool = True
    file_type: str = "image"
    filename: str
    file_id: str
    text: str
    risk: RiskInfo
    detected: List[DetectedDocumentItem]
    total_detected: int
    scan_id: Optional[int] = None


class PdfScanResponse(BaseModel):
    success: bool = True
    file_type: str = "pdf"
    filename: str
    file_id: str
    page_count: int
    text: str
    risk: RiskInfo
    detected: List[DetectedDocumentItem]
    total_detected: int
    scan_id: Optional[int] = None


class DocumentProtectResponse(BaseModel):
    success: bool = True
    filename: str
    protected_count: int
    kept_count: int
    download_url: str
    scan_id: Optional[int] = None
    purpose: Optional[str] = None
    risk_before: Optional[int] = None
    risk_after: Optional[int] = None
    exposure_reduction: Optional[float] = None
    protection_receipt: Optional[ProtectionReceipt] = None
