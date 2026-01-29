from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class RevealRequest(Base):
    __tablename__ = "reveal_requests"

    reveal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    solicitante_id = Column(UUID(as_uuid=True), ForeignKey("usuario.usuario_id"))
    motivo = Column(String, nullable=False)

    timestamp_solicitud = Column(DateTime, default=datetime.utcnow)
