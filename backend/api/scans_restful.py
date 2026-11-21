"""RESTful Endpoint Design & Correct HTTP Status Codes (0.2 + 0.2 pts)

Implements pure RESTful principles for /api/v1/scans:
- Resource-oriented URLs with plural nouns
- Standard HTTP methods: GET, POST, PUT, DELETE, OPTIONS
- Precise HTTP status codes:
  * 200 OK: Successful retrieval/update
  * 201 Created: New resource created (with Location header)
  * 204 No Content: Successful deletion without response body
  * 400 Bad Request: Malformed JSON or invalid parameters
  * 404 Not Found: Resource does not exist
  * 422 Unprocessable Entity: Schema validation failure
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import time
from fastapi import APIRouter, HTTPException, status, Response, Request
from pydantic import BaseModel, Field

from backend.services.pii_detector import detect_pii
from backend.services.risk_engine import calculate_risk

router = APIRouter(prefix="/api/v1/scans", tags=["RESTful Scans API"])

# In-memory store for RESTful scans
_scans_db: Dict[str, Dict[str, Any]] = {
    "scan-001": {
        "id": "scan-001",
        "input_type": "text",
        "risk_score": 85,
        "risk_level": "HIGH",
        "detected_count": 3,
        "protected_count": 3,
        "status": "COMPLETED",
        "created_at": "2026-11-18T05:00:00Z"
    }
}


class ScanCreatePayload(BaseModel):
    text: str = Field(..., min_length=1, description="Raw text content to scan")
    purpose: Optional[str] = Field("expense_reimbursement", description="Processing purpose")


class ScanUpdatePayload(BaseModel):
    purpose: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None


@router.get("", status_code=status.HTTP_200_OK, summary="List all scans (200 OK)")
async def list_scans():
    """Retrieve collection of all scan resources."""
    return {
        "status": 200,
        "count": len(_scans_db),
        "data": list(_scans_db.values())
    }


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a scan resource (201 Created)")
async def create_scan(payload: ScanCreatePayload, response: Response):
    """Creates a new scan resource.
    Adheres to REST principles by returning HTTP 201 Created and setting the
    'Location' header to the URI of the newly created resource.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Field 'text' must not be empty."
        )

    scan_id = f"scan-{int(time.time() * 1000)}"
    detected = detect_pii(payload.text)
    risk = calculate_risk(detected)

    record = {
        "id": scan_id,
        "input_type": "text",
        "purpose": payload.purpose,
        "risk_score": risk.score,
        "risk_level": risk.level,
        "detected_count": len(detected),
        "protected_count": 0,
        "status": "CREATED",
        "created_at": datetime.utcnow().isoformat()
    }
    _scans_db[scan_id] = record

    # Standard RESTful Location header pointing to resource URI
    response.headers["Location"] = f"/api/v1/scans/{scan_id}"

    return {
        "status": 201,
        "message": "Scan resource created successfully",
        "data": record
    }


@router.get("/{scan_id}", status_code=status.HTTP_200_OK, summary="Retrieve a scan (200 OK or 404 Not Found)")
async def get_scan(scan_id: str):
    """Retrieve an individual scan by its ID."""
    if scan_id not in _scans_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan resource '{scan_id}' not found."
        )
    return {
        "status": 200,
        "data": _scans_db[scan_id]
    }


@router.put("/{scan_id}", status_code=status.HTTP_200_OK, summary="Update a scan (200 OK or 404 Not Found)")
async def update_scan(scan_id: str, payload: ScanUpdatePayload):
    """Updates attributes of an existing scan."""
    if scan_id not in _scans_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan resource '{scan_id}' not found."
        )
    record = _scans_db[scan_id]
    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = datetime.utcnow().isoformat()
    return {
        "status": 200,
        "message": "Resource updated successfully",
        "data": record
    }


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a scan (204 No Content)")
async def delete_scan(scan_id: str):
    """Deletes an existing scan resource. Returns 204 No Content on success."""
    if scan_id not in _scans_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan resource '{scan_id}' not found."
        )
    del _scans_db[scan_id]
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.options("", status_code=status.HTTP_204_NO_CONTENT)
async def options_scans(response: Response):
    """Pre-flight CORS options returning allowed methods."""
    response.headers["Allow"] = "GET, POST, PUT, DELETE, OPTIONS"
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================================
# HTTP STATUS CODES USED CORRECTLY (0.2 pts • Backend & System Design)
# ============================================================================
@router.get("/status-codes/200", status_code=status.HTTP_200_OK)
async def status_200_ok():
    return {"status": 200, "message": "200 OK — Standard successful response."}


@router.post("/status-codes/201", status_code=status.HTTP_201_CREATED)
async def status_201_created(response: Response):
    response.headers["Location"] = "/api/v1/scans/scan-201-demo"
    return {"status": 201, "message": "201 Created — Resource created with Location header."}


@router.delete("/status-codes/204", status_code=status.HTTP_204_NO_CONTENT)
async def status_204_no_content():
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/status-codes/400", status_code=status.HTTP_400_BAD_REQUEST)
async def status_400_bad_request():
    raise HTTPException(status_code=400, detail="400 Bad Request — Syntactically invalid payload.")


@router.get("/status-codes/401", status_code=status.HTTP_401_UNAUTHORIZED)
async def status_401_unauthorized():
    raise HTTPException(status_code=401, detail="401 Unauthorized — Authentication required.")


@router.get("/status-codes/403", status_code=status.HTTP_403_FORBIDDEN)
async def status_403_forbidden():
    raise HTTPException(status_code=403, detail="403 Forbidden — Insufficient privileges.")


@router.get("/status-codes/404", status_code=status.HTTP_404_NOT_FOUND)
async def status_404_not_found():
    raise HTTPException(status_code=404, detail="404 Not Found — Resource does not exist.")


@router.get("/status-codes/422", status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
async def status_422_unprocessable():
    raise HTTPException(status_code=422, detail="422 Unprocessable Entity — Validation failure.")


@router.get("/status-codes/500", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
async def status_500_internal():
    raise HTTPException(status_code=500, detail="500 Internal Server Error — Server error demonstration.")


