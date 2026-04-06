"""
Alert history routes.
GET /alerts — list all triggered alerts
"""

import logging

from fastapi import APIRouter, Query

from app.models.schemas import AlertList
from app.services import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=AlertList,
    summary="List triggered alerts",
)
async def list_alerts(
    limit: int = Query(default=20, ge=1, le=100, description="Max results"),
):
    """Return all alerts ordered by newest first."""
    alerts = storage.list_alerts(limit=limit)
    total = len(storage.list_alerts(limit=10_000))
    return AlertList(alerts=alerts, total=total)
