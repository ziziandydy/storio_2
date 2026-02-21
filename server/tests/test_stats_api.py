import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user_id, security

client = TestClient(app)

def test_get_stats_structure():
    """
    Test that the stats endpoint returns the correct structure
    with 7d, 30d, and year metrics.
    """
    
    # Override dependencies to bypass auth
    app.dependency_overrides[get_current_user_id] = lambda: "test-user-id"
    app.dependency_overrides[security] = lambda: type('obj', (object,), {'credentials': 'mock-token'})

    # Mock the service call to avoid actual DB connection issues in unit test
    # (Or allow it to hit the DB if we want integration test style, but we need a test DB)
    # For now, let's see if the endpoint logic holds up.
    # The actual repository will fail if no real DB. 
    # Let's mock the CollectionService instead.
    
    from unittest.mock import patch
    with patch("app.api.v1.endpoints.collection.CollectionService") as MockService:
        instance = MockService.return_value
        instance.get_stats.return_value = {
            "last_7_days": 2,
            "last_30_days": 5,
            "this_year": 12
        }
        
        response = client.get("/api/v1/collection/stats")
        
        # Reset overrides
        app.dependency_overrides = {}

        assert response.status_code == 200
        data = response.json()
        
        assert "last_7_days" in data
        assert "last_30_days" in data
        assert "this_year" in data
        assert data["last_7_days"] == 2
        assert data["last_30_days"] == 5
        assert data["this_year"] == 12
