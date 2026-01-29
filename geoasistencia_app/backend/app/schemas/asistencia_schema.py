from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime

class RegistroAsistenciaRequest(BaseModel):
    usuario_id: UUID
    tipo: str = Field(..., pattern="^(entrada|salida|manual)$")
    latitud: Optional[float] = Field(default=None)
    longitud: Optional[float] = Field(default=None)
    modo: str = Field(..., pattern="^(app|manual|sync_offline)$")

    # Para marcación manual: permitir ingresar fecha/hora del evento.
    # Si no se envía, se registra la hora del servidor (UTC).
    timestamp_registro: Optional[datetime] = None

    device_info: Optional[Dict[str, Any]] = None
    evidence: Optional[str] = None

    # Para solicitudes manuales: el empleado debe explicar el motivo/detalle.
    # (Se mantiene `evidence` para compatibilidad, pero el backend prioriza `detalle`.)
    detalle: Optional[str] = None

    ip_detectada: Optional[str] = None
    ssid_detectada: Optional[str] = None
    bssid_detectada: Optional[str] = None
