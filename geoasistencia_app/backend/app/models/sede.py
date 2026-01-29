from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Sede(Base):
    __tablename__ = "sede"

    sede_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    nombre = Column(String, nullable=False)
    latitud = Column(String, nullable=False)      # DECIMAL(9,6) se maneja como string/float
    longitud = Column(String, nullable=False)
    radio_metros = Column(Integer, nullable=False)
    direccion = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
