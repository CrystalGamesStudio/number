import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.websocket import router as websocket_router
from app.users import router as users_router
from app.messages import router as messages_router
from app.files import router as files_router
from app.database import get_db_connection

app = FastAPI()

# CORS origins from environment variable or localhost defaults
cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(websocket_router)
app.include_router(users_router)
app.include_router(messages_router)
app.include_router(files_router)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/health")
def health_detailed():
    db_status = "disconnected"
    try:
        with get_db_connection() as conn:
            db_status = "connected"
    except Exception:
        pass
    return {"status": "ok", "database": db_status}
