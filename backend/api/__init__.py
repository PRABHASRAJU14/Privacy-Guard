"""API package for PrivacyGuard."""
from backend.api.scan import router as scan_router
from backend.api.purpose import router as purpose_router
from backend.api.protect import router as protect_router
from backend.api.scan_file import router as scan_file_router
from backend.api.protect_file import router as protect_file_router
from backend.api.history import router as history_router

__all__ = [
    "scan_router",
    "purpose_router",
    "protect_router",
    "scan_file_router",
    "protect_file_router",
    "history_router",
]
