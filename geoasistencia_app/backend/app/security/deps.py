from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.security.jwt import decode_token


bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Falta token")

    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(Usuario).filter(Usuario.usuario_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    # Adjuntamos payload por conveniencia (solo lectura)
    user._jwt_payload = payload  # type: ignore[attr-defined]
    return user


def require_roles(*roles: str):
    roles_set = {r.upper() for r in roles}

    def _checker(user: Usuario = Depends(get_current_user)) -> Usuario:
        if (user.rol or "").upper() not in roles_set:
            raise HTTPException(status_code=403, detail="No autorizado")
        return user

    return _checker
