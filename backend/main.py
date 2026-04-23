"""
CodeCollab Backend — FastAPI server for GitHub OAuth & API proxy.
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import auth, github  # noqa: E402

app = FastAPI(title="CodeCollab API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", FRONTEND_URL)
ALLOWED_ORIGINS = [origin.strip().rstrip("/") for origin in FRONTEND_ORIGINS.split(",") if origin.strip()] or [FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(github.router, prefix="/api/github", tags=["GitHub"])


@app.get("/")
def root_health():
    return {"status": "ok", "service": "CodeCollab API"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    reload_enabled = os.getenv("BACKEND_RELOAD", "true").lower() in {"1", "true", "yes", "on"}

    uvicorn.run("main:app", host=host, port=port, reload=reload_enabled)
