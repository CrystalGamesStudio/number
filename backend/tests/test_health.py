import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_check_returns_ok():
    """Health check endpoint returns status ok"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_check_includes_database_status():
    """Health check includes database connectivity status"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert data["database"] in ["connected", "disconnected"]
