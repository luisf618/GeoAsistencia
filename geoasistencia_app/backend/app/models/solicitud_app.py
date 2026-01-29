from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database import Base


class SolicitudApp(Base):
    """Solicitud pública para pedir acceso/implementación de la aplicación.

    Nota: no guarda datos sensibles. Solo datos de contacto mínimos.
    """

    __tablename__ = "solicitud_app"

    solicitud_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    empresa = Column(String, nullable=False)
    nombre_contacto = Column(String, nullable=False)
    email_contacto = Column(String, nullable=False)
    mensaje = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
