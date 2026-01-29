from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Enum, Integer
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from datetime import datetime
import uuid

class RegistroAsistencia(Base):
    __tablename__ = "registro_asistencia"

    registro_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuario.usuario_id"))
    sede_id = Column(UUID(as_uuid=True), ForeignKey("sede.sede_id"))

    tipo = Column(Enum("entrada", "salida", "manual", name="tipo_asistencia"))
    timestamp_registro = Column(DateTime, default=datetime.utcnow)

    latitud = Column(String)
    longitud = Column(String)
    dentro_geocerca = Column(Boolean)

    modo = Column(Enum("app", "manual", "sync_offline", name="modo_registro"))

    device_info = Column(JSONB)
    evidence = Column(String)

    ip_detectada = Column(String)
    ssid_detectada = Column(String)
    bssid_detectada = Column(String)
