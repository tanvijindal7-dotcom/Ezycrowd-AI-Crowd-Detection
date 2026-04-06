"""
Ezycrowd FastAPI application factory.
Configures CORS, mounts all routers, and exposes health + root endpoints.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import alerts, detect, sessions, stats
from app.utils.logging_config import setup_logging

# Configure logging before anything else
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(log_level)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Ezycrowd API",
    description=(
        "AI-driven smart crowd detection and management system. "
        "Upload images or video frames and receive real-time people counts "
        "with configurable threshold-based alerts."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the React frontend (served on a different port in dev)
# ---------------------------------------------------------------------------

# In production set ALLOWED_ORIGINS to the exact frontend domain.
# In development we allow all origins so the Vite dev server can reach us.
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(detect.router)
app.include_router(sessions.router)
app.include_router(alerts.router)
app.include_router(stats.router)


# ---------------------------------------------------------------------------
# Health check endpoint (required by the OpenAPI spec)
# ---------------------------------------------------------------------------

@app.get("/healthz", tags=["health"], summary="Health check")
async def health_check():
    """Returns {"status": "ok"} when the service is up and running."""
    return {"status": "ok"}


@app.get("/", tags=["health"], include_in_schema=False)
async def root():
    """Root redirect — points to interactive docs."""
    return {
        "message": "Ezycrowd API is running. See /docs for the interactive API documentation.",
        "docs": "/docs",
    }
