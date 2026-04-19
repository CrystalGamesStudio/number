from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from psycopg import Connection

from app.auth import decode_token
from app.database import get_db_connection
from app.websocket import manager

router = APIRouter(prefix="/users", tags=["users"])
security = HTTPBearer()


@router.get("")
def get_users(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get all users except current
            cur.execute(
                "SELECT id, email FROM users WHERE id != %s ORDER BY email",
                (int(user_id),)
            )
            results = cur.fetchall()

        # Build response with online status from WebSocket manager
        users = []
        for user_id, email in results:
            users.append({
                "id": user_id,
                "email": email,
                "online": user_id in manager.active_connections
            })

        return users
    finally:
        conn.close()
