"""PrivacyGuard FastAPI Application Entrypoint."""
import os
import logging
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

from contextlib import asynccontextmanager
from backend.api.scan import router as scan_router
from backend.api.purpose import router as purpose_router
from backend.api.protect import router as protect_router
from backend.api.scan_file import router as scan_file_router
from backend.api.protect_file import router as protect_file_router
from backend.api.history import router as history_router
from backend.api.ai import router as ai_router
from backend.services.ocr import get_ocr_status
from backend.database.database import init_db

# Configure safe logging (no sensitive content logged)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("privacyguard.server")

# Base directories
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
PROTECTED_DIR = BASE_DIR / "protected"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
PROTECTED_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler: automatically initializes database."""
    logger.info("Initializing PrivacyGuard SQLite database...")
    init_db()
    yield


# Initialize FastAPI app
app = FastAPI(
    title="PrivacyGuard API",
    description="Personal Data Leak Prevention & Privacy Minimization Engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for Live Server, local frontend, extensions
cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8000,http://127.0.0.1:8000",
)
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(scan_router)
app.include_router(purpose_router)
app.include_router(protect_router)
app.include_router(scan_file_router)
app.include_router(protect_file_router)
app.include_router(history_router)
app.include_router(ai_router)

# Mount Web Application Frontend & Extension
frontend_dir = BASE_DIR.parent / "Privacy Guard"
if frontend_dir.exists():
    @app.get("/", tags=["Frontend"])
    async def root():
        """Redirect root URL directly to the PrivacyGuard Landing page."""
        return RedirectResponse(url="/html/landing.html")

    if (frontend_dir / "css").exists():
        app.mount("/css", StaticFiles(directory=str(frontend_dir / "css")), name="css")
    if (frontend_dir / "js").exists():
        app.mount("/js", StaticFiles(directory=str(frontend_dir / "js")), name="js")
    if (frontend_dir / "html").exists():
        app.mount("/html", StaticFiles(directory=str(frontend_dir / "html")), name="html")

ext_dir = BASE_DIR.parent / "extension"
if ext_dir.exists():
    app.mount("/extension", StaticFiles(directory=str(ext_dir)), name="extension")


@app.get(
    "/api/health",
    tags=["System"],
    summary="Health check endpoint",
)
async def health_check():
    """Health check endpoint confirming API availability and OCR readiness."""
    ocr_info = get_ocr_status()
    return {
        "status": "ok",
        "service": "PrivacyGuard API",
        "version": "1.0.0",
        "ocr": ocr_info,
    }


# Global error handler for request validation failures
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Clean JSON response for invalid payloads."""
    status_code = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": "Validation Error",
            "details": exc.errors(),
        },
    )


# Catch-all exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler to prevent internal traces leaking."""
    logger.error("Unhandled server exception: %s", str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    logger.info("Starting PrivacyGuard API on http://%s:%d", host, port)
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
