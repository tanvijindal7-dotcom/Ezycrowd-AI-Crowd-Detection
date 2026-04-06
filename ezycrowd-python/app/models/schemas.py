"""
Pydantic models for request/response validation and serialization.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Detection(BaseModel):
    """A single person detection bounding box."""
    x: float = Field(..., description="X coordinate of bounding box (normalized 0-1)")
    y: float = Field(..., description="Y coordinate of bounding box (normalized 0-1)")
    width: float = Field(..., description="Width of bounding box (normalized 0-1)")
    height: float = Field(..., description="Height of bounding box (normalized 0-1)")
    confidence: float = Field(..., description="Detection confidence score (0.0-1.0)")


class DetectionResult(BaseModel):
    """Full result from a crowd detection operation."""
    sessionId: str = Field(..., description="Unique session ID for this detection")
    peopleCount: int = Field(..., description="Total number of people detected")
    alertTriggered: bool = Field(..., description="True if count exceeded threshold")
    threshold: int = Field(..., description="Alert threshold used")
    confidence: float = Field(..., description="Average confidence across all detections")
    processingTimeMs: float = Field(..., description="Processing time in milliseconds")
    timestamp: datetime = Field(..., description="When detection was performed")
    imageUrl: Optional[str] = Field(None, description="URL to annotated result image")
    detections: List[Detection] = Field(default_factory=list, description="Per-person detections")


class ThresholdConfig(BaseModel):
    """Alert threshold configuration."""
    threshold: int = Field(..., ge=1, description="Number of people that triggers an alert")


class Session(BaseModel):
    """A stored detection session record."""
    id: str
    peopleCount: int
    alertTriggered: bool
    threshold: int
    confidence: float
    processingTimeMs: float
    createdAt: datetime
    fileName: Optional[str] = None


class SessionList(BaseModel):
    """Paginated list of sessions."""
    sessions: List[Session]
    total: int


class Alert(BaseModel):
    """A triggered alert record."""
    id: str
    sessionId: str
    peopleCount: int
    threshold: int
    createdAt: datetime


class AlertList(BaseModel):
    """Paginated list of alerts."""
    alerts: List[Alert]
    total: int


class StatsSummary(BaseModel):
    """Aggregate statistics across all sessions."""
    totalSessions: int
    totalAlerts: int
    averagePeopleCount: float
    maxPeopleCount: int
    alertRate: float = Field(..., description="Fraction of sessions that triggered alerts (0.0-1.0)")
    recentSessions: List[Session] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    details: Optional[str] = None


class HealthStatus(BaseModel):
    """Health check response."""
    status: str
