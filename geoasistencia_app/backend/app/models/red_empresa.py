from sqlalchemy import Column, String, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid

class RedEmpresa(Base):
    __tablename__ = "red_empresa"

    red_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    sede_id = Column(UUID(as_uuid=True), ForeignKey("sede.sede_id"))

    nombre_red = Column(String, nullable=False)
    tipo = Column(Enum("WIFI", "IP_PUBLICA", name="tipo_red"))

    ssid = Column(String)
    bssid = Column(String)
    ip_publica = Column(String)

    activa = Column(Boolean, default=True)
