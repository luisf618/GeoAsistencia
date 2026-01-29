from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base
from datetime import datetime
import uuid


class SolicitudAsistenciaManual(Base):
    """Solicitud de asistencia manual.

    Privacidad/seguridad:
    - Se usa para que el ADMIN/SUPERADMIN pueda aprobar o rechazar
      registros manuales antes de que se materialicen en `registro_asistencia`.
    - El detalle puede contener información sensible, por eso la lectura
      de detalle se protege con verificación (contraseña + motivo) y token 60s.
    """

    __tablename__ = "solicitud_asistencia_manual"

    solicitud_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuario.usuario_id"), nullable=False)
    sede_id = Column(UUID(as_uuid=True), ForeignKey("sede.sede_id"), nullable=False)

    # entrada/salida
    tipo = Column(String, nullable=False)

    # Momento del evento que se desea registrar (no necesariamente el momento de solicitud)
    timestamp_evento = Column(DateTime, nullable=False, default=datetime.utcnow)

    latitud = Column(String, nullable=True)
    longitud = Column(String, nullable=True)
    device_info = Column(JSONB, nullable=True)
    evidence = Column(String, nullable=True)

    detalle = Column(String, nullable=False)

    # PENDIENTE | APROBADA | RECHAZADA
    estado = Column(String, nullable=False, default="PENDIENTE")

    created_at = Column(DateTime, default=datetime.utcnow)

    revisado_por = Column(UUID(as_uuid=True), ForeignKey("usuario.usuario_id"), nullable=True)
    revisado_at = Column(DateTime, nullable=True)
    decision_comentario = Column(String, nullable=True)
