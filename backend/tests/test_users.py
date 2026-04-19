import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_users_requires_authentication(async_client: AsyncClient):
    response = await async_client.get("/users")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_users_returns_all_users_except_current(async_client: AsyncClient):
    # Create three users
    resp1 = await async_client.post("/auth/register", json={"email": "user1@example.com", "password": "pass123"})
    resp2 = await async_client.post("/auth/register", json={"email": "user2@example.com", "password": "pass123"})
    resp3 = await async_client.post("/auth/register", json={"email": "user3@example.com", "password": "pass123"})

    token1 = resp1.json()["access_token"]
    user1_id = resp1.json()["user"]["id"]

    # Get users as user1
    response = await async_client.get("/users", headers={"Authorization": f"Bearer {token1}"})
    assert response.status_code == 200

    users = response.json()
    emails = [u["email"] for u in users]

    # Should return user2 and user3, but not user1 (current user)
    assert "user2@example.com" in emails
    assert "user3@example.com" in emails
    assert "user1@example.com" not in emails

    # All users should have id and online status
    for user in users:
        assert "id" in user
        assert "email" in user
        assert "online" in user
        assert isinstance(user["online"], bool)
