"""
In-memory storage for detection sessions and alerts.
In production, replace this with a real database (PostgreSQL, MongoDB, etc.)
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from app.models.schemas import Alert, Session, StatsSummary

# In-memory stores — replaced by a database in production
_sessions: Dict[str, Session] = {}
_alerts: Dict[str, Alert] = {}

# Default alert threshold (people count that triggers an alert)
_threshold: int = 10


def get_threshold() -> int:
    """Return the current alert threshold."""
    return _threshold


def set_threshold(value: int) -> None:
    """Update the global alert threshold."""
    global _threshold
    _threshold = value


def save_session(
    session_id: str,
    people_count: int,
    alert_triggered: bool,
    threshold: int,
    confidence: float,
    processing_time_ms: float,
    file_name: Optional[str] = None,
) -> Session:
    """Persist a new detection session and, if alert triggered, an alert record."""
    now = datetime.utcnow()

    session = Session(
        id=session_id,
        peopleCount=people_count,
        alertTriggered=alert_triggered,
        threshold=threshold,
        confidence=confidence,
        processingTimeMs=processing_time_ms,
        createdAt=now,
        fileName=file_name,
    )
    _sessions[session_id] = session

    if alert_triggered:
        alert_id = str(uuid.uuid4())
        alert = Alert(
            id=alert_id,
            sessionId=session_id,
            peopleCount=people_count,
            threshold=threshold,
            createdAt=now,
        )
        _alerts[alert_id] = alert

    return session


def get_session(session_id: str) -> Optional[Session]:
    """Retrieve a session by ID."""
    return _sessions.get(session_id)


def list_sessions(limit: int = 20, alert_only: bool = False) -> List[Session]:
    """
    Return sessions sorted newest-first.

    Args:
        limit: Maximum number of sessions to return
        alert_only: If True, only return sessions where alertTriggered=True
    """
    sessions = list(_sessions.values())
    if alert_only:
        sessions = [s for s in sessions if s.alertTriggered]
    # Sort newest first
    sessions.sort(key=lambda s: s.createdAt, reverse=True)
    return sessions[:limit]


def list_alerts(limit: int = 20) -> List[Alert]:
    """Return all alerts sorted newest-first."""
    alerts = list(_alerts.values())
    alerts.sort(key=lambda a: a.createdAt, reverse=True)
    return alerts[:limit]


def get_stats_summary() -> StatsSummary:
    """Compute aggregate statistics over all sessions."""
    all_sessions = list(_sessions.values())
    total = len(all_sessions)

    if total == 0:
        return StatsSummary(
            totalSessions=0,
            totalAlerts=0,
            averagePeopleCount=0.0,
            maxPeopleCount=0,
            alertRate=0.0,
            recentSessions=[],
        )

    alert_sessions = [s for s in all_sessions if s.alertTriggered]
    counts = [s.peopleCount for s in all_sessions]

    # Most recent 5 sessions for the dashboard feed
    recent = sorted(all_sessions, key=lambda s: s.createdAt, reverse=True)[:5]

    return StatsSummary(
        totalSessions=total,
        totalAlerts=len(alert_sessions),
        averagePeopleCount=sum(counts) / total,
        maxPeopleCount=max(counts),
        alertRate=len(alert_sessions) / total,
        recentSessions=recent,
    )
