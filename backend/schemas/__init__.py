"""Pydantic schemas for PrivacyGuard API.

Includes:
- Scan, Purpose, Protection, Document, and History schemas
- Embedding vs. Referencing Relationships (MongoDB / NoSQL data modeling)
"""
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
from backend.schemas.mongo_relationships import (
    FindingEmbedded,
    ReceiptEmbedded,
    ScanAuditDocumentEmbedded,
    UserReference,
    ScanDocumentReferenced,
)

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
    # Embedding vs Referencing Relationships (0.2 pts • NoSQL Mongo)
    "FindingEmbedded",
    "ReceiptEmbedded",
    "ScanAuditDocumentEmbedded",
    "UserReference",
    "ScanDocumentReferenced",
]
