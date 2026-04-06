"""
Statistics summary route.
GET /stats/summary — aggregate metrics across all sessions
"""

import logging

from fastapi import APIRouter

from app.models.schemas import StatsSummary
from app.services import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get(
    "/summary",
    response_model=StatsSummary,
    summary="Get crowd detection statistics summary",
)
async def get_stats_summary():
    """
    Return aggregate statistics covering all detection sessions:
    total sessions, total alerts, average/peak people counts, and alert rate.
    """
    return storage.get_stats_summary()
