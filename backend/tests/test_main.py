import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_health_check_returns_200():
    """Health check endpoint returns status OK"""
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
