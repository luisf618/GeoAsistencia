import os
from datetime import datetime, timedelta
from jose import jwt, JWTError

SECRET_KEY = os.getenv("JWT_SECRET", "geoasistencia-secret-dev")
ALGORITHM = "HS256"
EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "8"))

def create_token(data: dict, *, expires_in_seconds: int | None = None) -> str:
    """Crea un JWT.

    - Por defecto expira en EXP_HOURS.
    - Si se pasa expires_in_seconds, se usa ese TTL (útil para tokens temporales de 60s).
    """
    payload = dict(data)
    if expires_in_seconds is None:
        payload["exp"] = datetime.utcnow() + timedelta(hours=EXP_HOURS)
    else:
        payload["exp"] = datetime.utcnow() + timedelta(seconds=int(expires_in_seconds))
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError("Token inválido") from e
