from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routes.analytics import router as analytics_router
from app.routes.uploads import router as uploads_router

app = FastAPI(
    title="QualiQA Analytics API",
    description="Serviço de analytics e uploads para o QualiQA",
    version="1.0.0"
)

# CORS - aceitar qualquer porta localhost
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://localhost:\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import mimetypes

mimetypes.add_type("application/pdf", ".pdf")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("image/gif", ".gif")

# Mount uploads directory
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Routes
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["Uploads"])

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "QualiQA Python API"}
