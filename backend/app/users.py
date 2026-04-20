from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from psycopg import Connection

from app.auth import decode_token
from app.database import get_db_connection

ONLINE_THRESHOLD = timedelta(minutes=1)

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
            cur.execute(
                "SELECT id, email FROM users WHERE id != %s ORDER BY email",
                (int(user_id),)
            )
            results = cur.fetchall()

            cur.execute(
                "SELECT id FROM users WHERE last_seen > %s",
                (datetime.now(timezone.utc) - ONLINE_THRESHOLD,)
            )
            online_ids = {row[0] for row in cur.fetchall()}

        users = []
        for uid, email in results:
            users.append({
                "id": uid,
                "email": email,
                "online": uid in online_ids
            })

        return users
    finally:
        conn.close()
