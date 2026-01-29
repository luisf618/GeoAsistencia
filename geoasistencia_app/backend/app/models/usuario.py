from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime
import uuid

class Usuario(Base):
    __tablename__ = "usuario"

    usuario_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    documento = Column(String, nullable=False)
    nombre_real = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    telefono = Column(String)

    sede_id = Column(UUID(as_uuid=True), ForeignKey("sede.sede_id"))
    rol = Column(String, nullable=False)

    consentimiento_geolocalizacion = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
