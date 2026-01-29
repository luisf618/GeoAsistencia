from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from datetime import datetime
import uuid

class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    actor_usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuario.usuario_id"))
    entidad = Column(String, nullable=False)
    entidad_id = Column(UUID(as_uuid=True))
    accion = Column(String, nullable=False)

    detalle = Column(JSONB)
    ip = Column(String)

    timestamp = Column(DateTime, default=datetime.utcnow)
