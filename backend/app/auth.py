from datetime import datetime, timedelta, timezone
from typing import Annotated

from bcrypt import hashpw, gensalt, checkpw
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from pydantic import BaseModel, EmailStr
from psycopg import Connection

from app.database import get_db_connection

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


def hash_password(password: str) -> str:
    return hashpw(password.encode(), gensalt()).decode()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def save_session(conn: Connection, user_id: int, refresh_token: str) -> None:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user_id, refresh_token, expire)
        )
        conn.commit()


@router.post("/register", response_model=RegisterResponse)
def register(req: RegisterRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (req.email, hash_password(req.password))
            )
            user_id = cur.fetchone()[0]
            conn.commit()

        access_token = create_access_token({"sub": str(user_id), "email": req.email})
        refresh_token = create_refresh_token({"sub": str(user_id), "email": req.email})
        save_session(conn, user_id, refresh_token)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": user_id, "email": req.email}
        }
    except Exception as e:
        conn.rollback()
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise
    finally:
        conn.close()


@router.post("/login", response_model=RegisterResponse)
def login(req: LoginRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_hash FROM users WHERE email = %s",
                (req.email,)
            )
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            user_id, password_hash = result

        if not checkpw(req.password.encode(), password_hash.encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token({"sub": str(user_id), "email": req.email})
        refresh_token = create_refresh_token({"sub": str(user_id), "email": req.email})
        save_session(conn, user_id, refresh_token)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": user_id, "email": req.email}
        }
    finally:
        conn.close()


@router.post("/logout", status_code=204)
def logout(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    token = credentials.credentials
    decode_token(token)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM sessions WHERE token = %s",
                (token,)
            )
            conn.commit()
        return None
    finally:
        conn.close()


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
def get_me(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email FROM users WHERE id = %s",
                (int(user_id),)
            )
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=401, detail="User not found")
            return {"id": result[0], "email": result[1]}
    finally:
        conn.close()
