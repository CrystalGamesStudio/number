import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth import decode_token
from app.database import get_db_connection

router = APIRouter(prefix="/files", tags=["files"])
security = HTTPBearer()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

R2_ENDPOINT = os.environ.get("R2_ENDPOINT", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "")
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")

USE_R2 = bool(R2_ENDPOINT and R2_BUCKET and R2_ACCESS_KEY and R2_SECRET_KEY)
UPLOAD_DIR = Path("uploads")


def _upload_to_r2(content: bytes, stored_name: str, content_type: str) -> str:
    import boto3
    from botocore.config import Config as BotoConfig
    from io import BytesIO

    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=BotoConfig(signature_version="s3v4"),
    )
    s3.upload_fileobj(BytesIO(content), R2_BUCKET, stored_name, ExtraArgs={"ContentType": content_type})
    return f"{R2_ENDPOINT}/{R2_BUCKET}/{stored_name}"


def _upload_to_local(content: bytes, stored_name: str) -> str:
    UPLOAD_DIR.mkdir(exist_ok=True)
    (UPLOAD_DIR / stored_name).write_bytes(content)
    return f"/files/serve/{stored_name}"


@router.post("/upload")
async def upload_file(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    file: UploadFile,
):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"File type {file.content_type} not allowed.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    stored_name = f"{uuid.uuid4()}.{ext}"

    try:
        if USE_R2:
            url = _upload_to_r2(content, stored_name, file.content_type)
        else:
            url = _upload_to_local(content, stored_name)
    except Exception:
        raise HTTPException(status_code=503, detail="File storage unavailable.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO files (filename, original_filename, size, url, content_type, uploaded_by)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (stored_name, file.filename, len(content), url, file.content_type, int(user_id)),
            )
            file_id = cur.fetchone()[0]
            conn.commit()
    finally:
        conn.close()

    return {
        "id": file_id,
        "filename": stored_name,
        "original_filename": file.filename,
        "url": url,
        "content_type": file.content_type,
        "size": len(content),
    }


@router.get("/serve/{stored_name}")
async def serve_file(stored_name: str):
    from fastapi.responses import FileResponse

    path = UPLOAD_DIR / stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@router.get("/{file_id}/url")
def get_presigned_url(
    file_id: int,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT url FROM files WHERE id = %s", (file_id,))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    return {"url": row[0]}
