"""
Tests for the crowd detection API endpoints.
Run with: pytest tests/ -v
"""

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _make_test_image_bytes(width: int = 640, height: int = 480) -> bytes:
    """Create a blank PNG image in memory for testing."""
    img = Image.new("RGB", (width, height), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestHealthCheck:
    def test_health_returns_ok(self):
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestThreshold:
    def test_get_default_threshold(self):
        response = client.get("/detect/threshold")
        assert response.status_code == 200
        data = response.json()
        assert "threshold" in data
        assert isinstance(data["threshold"], int)

    def test_update_threshold(self):
        response = client.put("/detect/threshold", json={"threshold": 25})
        assert response.status_code == 200
        assert response.json()["threshold"] == 25

        # Verify the change persisted
        get_resp = client.get("/detect/threshold")
        assert get_resp.json()["threshold"] == 25

        # Reset to default for other tests
        client.put("/detect/threshold", json={"threshold": 10})

    def test_update_threshold_invalid(self):
        # Threshold must be >= 1
        response = client.put("/detect/threshold", json={"threshold": 0})
        assert response.status_code == 422


class TestDetection:
    def test_detect_no_file_returns_422(self):
        response = client.post("/detect")
        assert response.status_code == 422

    def test_detect_unsupported_type_returns_400(self):
        data = {"file": ("test.txt", b"hello world", "text/plain")}
        response = client.post("/detect", files=data)
        assert response.status_code == 400

    def test_detect_valid_image_returns_result(self):
        image_bytes = _make_test_image_bytes()
        files = {"file": ("crowd.png", image_bytes, "image/png")}
        response = client.post("/detect", files=files)
        assert response.status_code == 200
        data = response.json()

        assert "sessionId" in data
        assert "peopleCount" in data
        assert isinstance(data["peopleCount"], int)
        assert data["peopleCount"] >= 0
        assert "alertTriggered" in data
        assert isinstance(data["alertTriggered"], bool)
        assert "confidence" in data
        assert "processingTimeMs" in data
        assert "detections" in data

    def test_detect_with_custom_threshold(self):
        image_bytes = _make_test_image_bytes()
        files = {"file": ("test.png", image_bytes, "image/png")}
        data = {"threshold": "1"}  # Very low threshold to test alert trigger
        response = client.post("/detect", files=files, data=data)
        assert response.status_code == 200


class TestSessions:
    def test_list_sessions_empty_initially(self):
        response = client.get("/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total" in data

    def test_get_nonexistent_session_returns_404(self):
        response = client.get("/sessions/nonexistent-id")
        assert response.status_code == 404

    def test_session_stored_after_detection(self):
        image_bytes = _make_test_image_bytes()
        files = {"file": ("test.png", image_bytes, "image/png")}
        detect_resp = client.post("/detect", files=files)
        session_id = detect_resp.json()["sessionId"]

        get_resp = client.get(f"/sessions/{session_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == session_id


class TestStats:
    def test_stats_summary_structure(self):
        response = client.get("/stats/summary")
        assert response.status_code == 200
        data = response.json()
        assert "totalSessions" in data
        assert "totalAlerts" in data
        assert "averagePeopleCount" in data
        assert "maxPeopleCount" in data
        assert "alertRate" in data


class TestAlerts:
    def test_list_alerts_returns_list(self):
        response = client.get("/alerts")
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert "total" in data
