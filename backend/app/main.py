from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.websocket import router as websocket_router
from app.users import router as users_router
from app.messages import router as messages_router
from app.files import router as files_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
