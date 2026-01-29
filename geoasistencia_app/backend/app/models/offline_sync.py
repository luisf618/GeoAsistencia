from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from datetime import datetime
import uuid

class OfflineSync(Base):
    __tablename__ = "offline_sync"

    sync_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuario.usuario_id"))

    payload = Column(JSONB, nullable=False)
    status = Column(Enum("pending", "processed", "failed", name="sync_status"))

    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
