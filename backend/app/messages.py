from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth import decode_token
from app.database import get_db_connection

router = APIRouter(prefix="/messages", tags=["messages"])
security = HTTPBearer()


@router.get("/{other_user_id}")
def get_messages(
    other_user_id: int,
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
                """SELECT id, sender_id, receiver_id, content, created_at
                   FROM messages
                   WHERE (sender_id = %s AND receiver_id = %s)
                      OR (sender_id = %s AND receiver_id = %s)
                   ORDER BY created_at ASC""",
                (int(user_id), other_user_id, other_user_id, int(user_id))
            )
            results = cur.fetchall()

        messages = []
        for msg_id, sender_id, receiver_id, content, created_at in results:
            messages.append({
                "id": msg_id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "content": content,
                "created_at": created_at.isoformat() if created_at else None
            })

        return messages
    finally:
        conn.close()
