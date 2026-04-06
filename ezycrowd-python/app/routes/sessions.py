"""
Detection session history routes.
GET /sessions           — list all sessions
GET /sessions/{id}      — get specific session
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import ErrorResponse, Session, SessionList
from app.services import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get(
    "",
    response_model=SessionList,
    summary="List detection sessions",
)
async def list_sessions(
    limit: int = Query(default=20, ge=1, le=100, description="Max results"),
    alert_only: bool = Query(default=False, description="Only show sessions with alerts"),
):
    """
    Return recent detection sessions, newest first.
    Optionally filter to only sessions that triggered an alert.
    """
    sessions = storage.list_sessions(limit=limit, alert_only=alert_only)
    total = len(storage.list_sessions(limit=10_000, alert_only=alert_only))
    return SessionList(sessions=sessions, total=total)


@router.get(
    "/{session_id}",
    response_model=Session,
    responses={404: {"model": ErrorResponse}},
    summary="Get a detection session by ID",
)
async def get_session(session_id: str):
    """Retrieve a single detection session by its unique ID."""
    session = storage.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return session
