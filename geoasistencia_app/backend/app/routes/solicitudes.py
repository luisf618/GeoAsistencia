from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.security.deps import get_db
from app.models.solicitud_app import SolicitudApp


router = APIRouter()


class SolicitudCreate(BaseModel):
    empresa: str = Field(..., min_length=2, max_length=120)
    nombre_contacto: str = Field(..., min_length=2, max_length=120)
    email_contacto: EmailStr
    mensaje: str = Field(..., min_length=20, max_length=2000)


@router.post("/")
def crear_solicitud(
    payload: SolicitudCreate,
    db: Session = Depends(get_db),
    req: Request = None,
):
    # Anti-abuso simple: evitar spam muy básico (sin captchas)
    # En producción: reCAPTCHA / rate limit por IP.
    solicitud = SolicitudApp(
        empresa=payload.empresa.strip(),
        nombre_contacto=payload.nombre_contacto.strip(),
        email_contacto=str(payload.email_contacto).strip().lower(),
        mensaje=payload.mensaje.strip(),
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)

    return {"ok": True, "solicitud_id": str(solicitud.solicitud_id)}
