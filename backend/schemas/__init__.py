"""Pydantic schemas for PrivacyGuard API."""
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

__all__ = [
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
]
