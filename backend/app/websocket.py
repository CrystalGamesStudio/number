from typing import Dict
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt
from starlette.websockets import WebSocketDisconnect as StarletteWebSocketDisconnect
from psycopg import Connection

from app.auth import SECRET_KEY, ALGORITHM
from app.database import get_db_connection

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)


manager = ConnectionManager()


def decode_jwt(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            return int(user_id)
        return None
    except jwt.JWTError:
        return None


def save_message(conn: Connection, sender_id: int, receiver_id: int, content: str) -> int:
    """Save message to database and return message ID"""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
            (sender_id, receiver_id, content, datetime.now(timezone.utc))
        )
        msg_id = cur.fetchone()[0]
        conn.commit()
        return msg_id


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT auth token")
):
    user_id = decode_jwt(token)
    if not user_id:
        await websocket.close(code=1008, reason="Invalid or missing token")
        return

    await manager.connect(user_id, websocket)
    conn = get_db_connection()

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "message":
                receiver_id = data.get("to")
                content = data.get("content")

                if not receiver_id or not content:
                    await websocket.send_json({"type": "error", "message": "Missing 'to' or 'content'"})
                    continue

                # Save to database
                msg_id = save_message(conn, user_id, receiver_id, content)

                # Send to recipient if online
                await manager.send_to_user(receiver_id, {
                    "type": "message",
                    "id": msg_id,
                    "from": user_id,
                    "content": content
                })
            else:
                # Echo for unknown message types (for ping test)
                await websocket.send_json({"type": "echo", "data": data})

    except StarletteWebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)
        raise
    finally:
        conn.close()
