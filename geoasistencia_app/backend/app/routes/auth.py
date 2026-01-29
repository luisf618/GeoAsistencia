from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.models.sede import Sede
from app.security.hash import verify_password
from app.security.jwt import create_token
from app.schemas.auth_schema import LoginRequest

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Login unificado (Web): EMPLEADO / ADMIN / SUPERADMIN.
    # La autorización fina se controla por endpoint/rol.

    sede = db.query(Sede).filter(Sede.sede_id == user.sede_id).first()
    if not sede:
        raise HTTPException(status_code=400, detail="Usuario sin sede asignada")

    token = create_token({"sub": str(user.usuario_id)})

    return {
        "token": token,
        "usuario_id": str(user.usuario_id),
        "rol": (user.rol or "").upper(),
        "sede_id": str(user.sede_id) if user.sede_id else None,
        "sede": {
            "nombre": sede.nombre,
            "latitud": sede.latitud,
            "longitud": sede.longitud,
            "radio": sede.radio_metros
        }
    }
