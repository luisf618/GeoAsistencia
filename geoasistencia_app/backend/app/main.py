from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.database import Base, engine
from app import models  # noqa: F401
from app.routes.auth import router as auth_router
from app.routes.asistencia import router as asistencia_router
from app.routes.admin import router as admin_router
from app.routes.solicitudes import router as solicitudes_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GeoAsistencia API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(asistencia_router, prefix="/asistencia", tags=["asistencia"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(solicitudes_router, prefix="/solicitudes", tags=["solicitudes"])

# Panel web (estático)
app.mount("/panel", StaticFiles(directory="app/static/admin", html=True), name="panel")

# Frontend SPA (React build). Usa HashRouter, así que no requiere fallback de rutas.
WEB_DIR = Path(__file__).parent / 'static' / 'web'
if WEB_DIR.exists() and (WEB_DIR / 'index.html').exists():
    app.mount('/', StaticFiles(directory=str(WEB_DIR), html=True), name='web')

@app.get("/health")
def health():
    return {"ok": True}
