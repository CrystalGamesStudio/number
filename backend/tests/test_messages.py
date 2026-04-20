import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db_connection


@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_get_messages_requires_authentication(async_client: AsyncClient):
    response = await async_client.get("/messages/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_messages_returns_conversation_history(async_client: AsyncClient):
    resp1 = await async_client.post("/auth/register", json={"email": "alice@example.com", "password": "pass123"})
    resp2 = await async_client.post("/auth/register", json={"email": "bob@example.com", "password": "pass123"})

    token1 = resp1.json()["access_token"]
    alice_id = resp1.json()["user"]["id"]
    bob_id = resp2.json()["user"]["id"]

    from app.database import get_db_connection
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (%s, %s, %s, NOW())",
                (alice_id, bob_id, "Hi Bob")
            )
            cur.execute(
                "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (%s, %s, %s, NOW())",
                (bob_id, alice_id, "Hello Alice")
            )
            cur.execute(
                "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (%s, %s, %s, NOW())",
                (alice_id, bob_id, "How are you?")
            )
            conn.commit()
    finally:
        conn.close()

    response = await async_client.get(
        f"/messages/{bob_id}",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert response.status_code == 200

    messages = response.json()
    assert len(messages) == 3

    for msg in messages:
        assert "id" in msg
        assert "sender_id" in msg
        assert "receiver_id" in msg
        assert "content" in msg
        assert "created_at" in msg

    contents = [m["content"] for m in messages]
    assert "Hi Bob" in contents
    assert "Hello Alice" in contents
    assert "How are you?" in contents
