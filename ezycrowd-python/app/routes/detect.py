"""
Crowd detection routes.
POST /detect   — upload a file, run YOLO detection, return result
GET  /detect/threshold — return current alert threshold
PUT  /detect/threshold — update alert threshold
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.models.schemas import DetectionResult, Detection, ErrorResponse, ThresholdConfig
from app.services import detection as detection_svc
from app.services import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/detect", tags=["detect"])


@router.post(
    "",
    response_model=DetectionResult,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Detect crowd in uploaded image or video",
)
async def detect_crowd(
    file: UploadFile = File(..., description="Image or video file to analyze"),
    threshold: Optional[int] = Form(None, description="Alert threshold (overrides global setting)"),
):
    """
    Accept an image or video file upload, run YOLOv8 person detection,
    and return the people count along with an alert flag if the count
    exceeds the configured threshold.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    # Read file content into memory
    try:
        file_bytes = await file.read()
    except Exception as exc:
        logger.error(f"Failed to read uploaded file: {exc}")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {exc}")

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Use the globally configured threshold unless caller overrides it
    active_threshold = threshold if threshold is not None else storage.get_threshold()

    logger.info(f"Processing file '{file.filename}' ({len(file_bytes)} bytes), threshold={active_threshold}")

    # Run detection
    try:
        count, confidence, detections, elapsed_ms = detection_svc.process_uploaded_file(
            file_bytes=file_bytes,
            filename=file.filename,
        )
    except ValueError as exc:
        # Unsupported file type or decode failure
        logger.warning(f"Detection input error: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Detection processing error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}")

    alert_triggered = count >= active_threshold
    session_id = str(uuid.uuid4())

    # Persist the session
    storage.save_session(
        session_id=session_id,
        people_count=count,
        alert_triggered=alert_triggered,
        threshold=active_threshold,
        confidence=confidence,
        processing_time_ms=elapsed_ms,
        file_name=file.filename,
    )

    if alert_triggered:
        logger.warning(
            f"ALERT: {count} people detected (threshold={active_threshold}) "
            f"in session {session_id}"
        )
    else:
        logger.info(
            f"Detection complete: {count} people, confidence={confidence:.2f}, "
            f"time={elapsed_ms:.1f}ms, session={session_id}"
        )

    return DetectionResult(
        sessionId=session_id,
        peopleCount=count,
        alertTriggered=alert_triggered,
        threshold=active_threshold,
        confidence=confidence,
        processingTimeMs=elapsed_ms,
        timestamp=datetime.utcnow(),
        imageUrl=None,  # Annotated image URL could be added here in a future version
        detections=[Detection(**d) for d in detections],
    )


@router.get(
    "/threshold",
    response_model=ThresholdConfig,
    summary="Get current alert threshold",
)
async def get_threshold():
    """Return the currently configured alert threshold."""
    return ThresholdConfig(threshold=storage.get_threshold())


@router.put(
    "/threshold",
    response_model=ThresholdConfig,
    summary="Update alert threshold",
)
async def update_threshold(config: ThresholdConfig):
    """
    Update the global alert threshold. Subsequent detections will use
    this value unless overridden per-request.
    """
    storage.set_threshold(config.threshold)
    logger.info(f"Alert threshold updated to {config.threshold}")
    return ThresholdConfig(threshold=config.threshold)
