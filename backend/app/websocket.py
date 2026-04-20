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
        self._update_last_seen(user_id)
        await self._broadcast_presence(user_id, online=True)

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)
        # Schedule broadcast — caller must await
        self._pending_disconnect = user_id

    async def finish_disconnect(self, user_id: int):
        self._update_last_seen(user_id)
        if user_id not in self.active_connections:
            await self._broadcast_presence(user_id, online=False)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    def _update_last_seen(self, user_id: int):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET last_seen = %s WHERE id = %s",
                    (datetime.now(timezone.utc), user_id)
                )
                conn.commit()
        finally:
            conn.close()

    async def _broadcast_presence(self, user_id: int, online: bool):
        msg = {"type": "presence", "user_id": user_id, "online": online}
        for uid, ws in list(self.active_connections.items()):
            if uid != user_id:
                await ws.send_json(msg)


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
    # Debug logging
    print(f"WebSocket connection attempt from origin: {websocket.headers.get('origin')}")

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
                content = data.get("content", "")

                if not receiver_id:
                    await websocket.send_json({"type": "error", "message": "Missing 'to'"})
                    continue

                if not content and not data.get("file_url"):
                    await websocket.send_json({"type": "error", "message": "Missing 'content' or file"})
                    continue

                msg_id = save_message(conn, user_id, receiver_id, content)

                msg_payload = {
                    "type": "message",
                    "id": msg_id,
                    "from": user_id,
                    "content": content,
                }

                if data.get("file_url"):
                    msg_payload["file_url"] = data["file_url"]
                    msg_payload["file_type"] = data.get("file_type", "")
                    msg_payload["file_name"] = data.get("file_name", "")

                # Send to recipient if online
                await manager.send_to_user(receiver_id, msg_payload)

                # Send confirmation back to sender
                await websocket.send_json(msg_payload)
            elif data.get("type") == "typing":
                receiver_id = data.get("to")
                is_typing = data.get("is_typing", True)

                if not receiver_id:
                    await websocket.send_json({"type": "error", "message": "Missing 'to'"})
                    continue

                await manager.send_to_user(receiver_id, {
                    "type": "typing",
                    "from": user_id,
                    "is_typing": is_typing,
                })
            elif data.get("type") == "heartbeat":
                manager._update_last_seen(user_id)
                await websocket.send_json({"type": "heartbeat_ack"})
            else:
                # Echo for unknown message types (for ping test)
                await websocket.send_json({"type": "echo", "data": data})

    except StarletteWebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.finish_disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)
        await manager.finish_disconnect(user_id)
        raise
    finally:
        conn.close()
