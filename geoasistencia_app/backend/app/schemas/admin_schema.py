from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SedeCreate(BaseModel):
    nombre: str
    latitud: str
    longitud: str
    radio_metros: int
    direccion: Optional[str] = None


class SedeUpdate(BaseModel):
    nombre: Optional[str] = None
    latitud: Optional[str] = None
    longitud: Optional[str] = None
    radio_metros: Optional[int] = None
    direccion: Optional[str] = None


class UsuarioCreate(BaseModel):
    # codigo interno autogenerado para EMPLEADO (por privacidad)
    documento: Optional[str] = None
    nombre_real: str = Field(..., min_length=3)
    email: EmailStr
    telefono: Optional[str] = None
    password: str = Field(..., min_length=6)

    sede_id: Optional[str] = None
    rol: str


class UsuarioUpdate(BaseModel):
    documento: Optional[str] = None
    nombre_real: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)
    sede_id: Optional[str] = None
    rol: Optional[str] = None


class RevealPIIRequest(BaseModel):
    target_usuario_id: str
    motivo: str = Field(..., min_length=15)
    password: str


class ActionVerifyRequest(BaseModel):
    action: str = Field(..., min_length=3)
    motivo: str = Field(..., min_length=15)
    password: str
