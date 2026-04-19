import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.main import app
from jose import jwt
from app.auth import SECRET_KEY, ALGORITHM
from app.database import get_db_connection

client = TestClient(app)


def test_websocket_rejects_invalid_token():
    """WebSocket rejects connection when JWT token is invalid"""
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws?token=invalid_token"):
            pass
    assert exc_info.value.code == 1008


def test_websocket_accepts_valid_token():
    """WebSocket accepts connection with valid JWT token"""
    token = jwt.encode({"sub": "1", "email": "test@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    with client.websocket_connect(f"/ws?token={token}") as websocket:
        websocket.send_json({"type": "ping"})
        data = websocket.receive_json()
        assert data["type"] == "echo"


def test_multiple_connections_same_user():
    """Multiple connections from same user can be established (latest replaces)"""
    token = jwt.encode({"sub": "1", "email": "test@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    with client.websocket_connect(f"/ws?token={token}") as ws1:
        ws1.send_json({"type": "ping"})
        assert ws1.receive_json()["type"] == "echo"
        with client.websocket_connect(f"/ws?token={token}") as ws2:
            ws2.send_json({"type": "ping"})
            assert ws2.receive_json()["type"] == "echo"


def test_messages_table_exists():
    """Messages table exists with correct schema"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'messages'
                )
            """)
            exists = cur.fetchone()[0]
            assert exists, "Messages table should exist"

            cur.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'messages'
                ORDER BY ordinal_position
            """)
            columns = {row[0]: {"type": row[1], "nullable": row[2]} for row in cur.fetchall()}

            assert "id" in columns
            assert "sender_id" in columns
            assert "receiver_id" in columns
            assert "content" in columns
            assert "created_at" in columns
            assert "read_at" in columns
    finally:
        conn.close()


def test_message_saves_to_database():
    """Message is saved to database when sent via WebSocket"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM messages")
            conn.commit()

        token = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

        with client.websocket_connect(f"/ws?token={token}") as ws:
            # Send message (user 2 doesn't need to be connected for DB save)
            ws.send_json({"type": "message", "to": 2, "content": "Hello user2!"})

        # Verify message is in database
        with conn.cursor() as cur:
            cur.execute("SELECT sender_id, receiver_id, content FROM messages")
            result = cur.fetchone()
            assert result is not None
            assert result[0] == 1  # sender_id
            assert result[1] == 2  # receiver_id
            assert result[2] == "Hello user2!"  # content
    finally:
        conn.close()


def test_message_delivered_to_online_recipient():
    """Message is delivered to recipient if they are online"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    # Connect user2 first
    with client.websocket_connect(f"/ws?token={token2}") as ws2:
        # Then connect user1 and send message
        with client.websocket_connect(f"/ws?token={token1}") as ws1:
            ws1.send_json({"type": "message", "to": 2, "content": "Hello user2!"})

        # User2 should receive the message
        received = ws2.receive_json()
        assert received["type"] == "message"
        assert received["from"] == 1
        assert received["content"] == "Hello user2!"
