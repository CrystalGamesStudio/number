import pytest
import threading
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.main import app
from jose import jwt
from app.auth import SECRET_KEY, ALGORITHM
from app.database import get_db_connection

client = TestClient(app)


def _receive(ws, timeout=3):
    """Receive a WebSocket message with timeout"""
    result = [None]
    def _recv():
        try:
            result[0] = ws.receive_json()
        except Exception:
            pass
    t = threading.Thread(target=_recv)
    t.start()
    t.join(timeout=timeout)
    return result[0]


def test_presence_event_broadcast_on_connect():
    """All connected users receive presence event when a new user connects"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    with client.websocket_connect(f"/ws?token={token1}") as ws1:
        with client.websocket_connect(f"/ws?token={token2}"):
            presence = _receive(ws1)
            assert presence is not None, "Should receive presence event on connect"
            assert presence["type"] == "presence"
            assert presence["user_id"] == 2
            assert presence["online"] is True


def test_presence_event_broadcast_on_disconnect():
    """Connected users receive presence offline event when a user disconnects"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    with client.websocket_connect(f"/ws?token={token1}") as ws1:
        with client.websocket_connect(f"/ws?token={token2}"):
            # Drain connect presence
            _receive(ws1, timeout=1)

        # After ws2 disconnects, ws1 should receive offline presence
        presence = _receive(ws1)
        assert presence is not None, "Should receive presence event on disconnect"
        assert presence["type"] == "presence"
        assert presence["user_id"] == 2
        assert presence["online"] is False


def test_heartbeat_updates_last_seen():
    """Heartbeat message updates user's last_seen timestamp"""
    from datetime import datetime, timezone, timedelta

    conn = get_db_connection()
    try:
        # Ensure user exists
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE id = 1")
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO users (id, email, password_hash) VALUES (1, 'hb@test.com', 'x')")
                conn.commit()

        token = jwt.encode({"sub": "1", "email": "hb@test.com"}, SECRET_KEY, algorithm=ALGORITHM)

        with client.websocket_connect(f"/ws?token={token}") as ws:
            # Connect sets last_seen. Reset it to old value while connected.
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET last_seen = %s WHERE id = 1",
                    (datetime.now(timezone.utc) - timedelta(hours=1),)
                )
                conn.commit()

            old_seen = datetime.now(timezone.utc) - timedelta(hours=1)

            ws.send_json({"type": "heartbeat"})
            _receive(ws, timeout=2)

            # Check last_seen was updated by heartbeat, before disconnect
            with conn.cursor() as cur:
                cur.execute("SELECT last_seen FROM users WHERE id = 1")
                last_seen = cur.fetchone()[0]
                assert last_seen > old_seen, "Heartbeat should update last_seen"
    finally:
        conn.close()


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
            ws.send_json({"type": "message", "to": 2, "content": "Hello user2!"})

        with conn.cursor() as cur:
            cur.execute("SELECT sender_id, receiver_id, content FROM messages")
            result = cur.fetchone()
            assert result is not None
            assert result[0] == 1
            assert result[1] == 2
            assert result[2] == "Hello user2!"
    finally:
        conn.close()


def test_message_delivered_to_online_recipient():
    """Message is delivered to recipient if they are online"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    with client.websocket_connect(f"/ws?token={token2}") as ws2:
        with client.websocket_connect(f"/ws?token={token1}") as ws1:
            # Drain presence event from user1's connect
            _receive(ws2, timeout=1)
            ws1.send_json({"type": "message", "to": 2, "content": "Hello user2!"})

        received = ws2.receive_json()
        assert received["type"] == "message"
        assert received["from"] == 1
        assert received["content"] == "Hello user2!"


def test_typing_indicator_relayed_to_recipient():
    """Typing indicator is relayed to the conversation partner"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    with client.websocket_connect(f"/ws?token={token2}") as ws2:
        with client.websocket_connect(f"/ws?token={token1}") as ws1:
            # Drain presence event
            _receive(ws2, timeout=1)
            ws1.send_json({"type": "typing", "to": 2, "is_typing": True})

        received = ws2.receive_json()
        assert received["type"] == "typing"
        assert received["from"] == 1
        assert received["is_typing"] is True


def test_typing_indicator_not_relayed_to_wrong_user():
    """Typing indicator is NOT sent to users who are not the recipient"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token3 = jwt.encode({"sub": "3", "email": "user3@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    with client.websocket_connect(f"/ws?token={token3}") as ws3:
        with client.websocket_connect(f"/ws?token={token2}") as ws2:
            # Drain: ws3 gets presence for user2 connect, ws2 gets nothing (no one else)
            _receive(ws3, timeout=1)
            with client.websocket_connect(f"/ws?token={token1}") as ws1:
                # Drain: ws2 gets presence for user1, ws3 gets presence for user1
                _receive(ws2, timeout=1)
                _receive(ws3, timeout=1)

                ws1.send_json({"type": "typing", "to": 2, "is_typing": True})

                received = ws2.receive_json()
                assert received["type"] == "typing"
                assert received["from"] == 1

        # User3 should NOT receive the typing event
        msg = _receive(ws3, timeout=1)
        assert msg is None or msg.get("type") == "presence", \
            "User3 should not receive typing event"


def test_typing_stop_indicator():
    """Typing stop (is_typing: false) is also relayed"""
    token1 = jwt.encode({"sub": "1", "email": "user1@example.com"}, SECRET_KEY, algorithm=ALGORITHM)
    token2 = jwt.encode({"sub": "2", "email": "user2@example.com"}, SECRET_KEY, algorithm=ALGORITHM)

    with client.websocket_connect(f"/ws?token={token2}") as ws2:
        with client.websocket_connect(f"/ws?token={token1}") as ws1:
            # Drain presence event
            _receive(ws2, timeout=1)
            ws1.send_json({"type": "typing", "to": 2, "is_typing": False})

        received = ws2.receive_json()
        assert received["type"] == "typing"
        assert received["from"] == 1
        assert received["is_typing"] is False
