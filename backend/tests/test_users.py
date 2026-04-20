import pytest
from httpx import AsyncClient
from datetime import datetime, timezone, timedelta

from app.database import get_db_connection


def test_users_table_has_last_seen_column():
    """Users table has last_seen timestamp column for presence tracking"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'last_seen'
            """)
            result = cur.fetchone()
            assert result is not None, "last_seen column should exist"
            assert result[1] in ("timestamp with time zone", "timestamptz"), \
                f"last_seen should be timestamptz, got {result[1]}"
    finally:
        conn.close()


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


@pytest.mark.asyncio
async def test_get_users_online_based_on_last_seen(async_client: AsyncClient):
    """Online status is based on last_seen timestamp, not WebSocket connections"""
    resp1 = await async_client.post("/auth/register", json={"email": "online@example.com", "password": "pass123"})
    resp2 = await async_client.post("/auth/register", json={"email": "recent@example.com", "password": "pass123"})
    resp3 = await async_client.post("/auth/register", json={"email": "stale@example.com", "password": "pass123"})
    resp_me = await async_client.post("/auth/register", json={"email": "me@example.com", "password": "pass123"})

    token = resp_me.json()["access_token"]

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # online: last_seen 10s ago
            cur.execute(
                "UPDATE users SET last_seen = %s WHERE email = %s",
                (datetime.now(timezone.utc) - timedelta(seconds=10), "online@example.com")
            )
            # recent but over 1 min: last_seen 90s ago
            cur.execute(
                "UPDATE users SET last_seen = %s WHERE email = %s",
                (datetime.now(timezone.utc) - timedelta(seconds=90), "recent@example.com")
            )
            # stale: last_seen null (never connected)
            # no update needed
            conn.commit()
    finally:
        conn.close()

    response = await async_client.get("/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    users = response.json()
    by_email = {u["email"]: u["online"] for u in users}

    assert by_email["online@example.com"] is True, "User seen 10s ago should be online"
    assert by_email["recent@example.com"] is False, "User seen 90s ago should be offline"
    assert by_email["stale@example.com"] is False, "User never seen should be offline"
