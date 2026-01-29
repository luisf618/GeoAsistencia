# Importa modelos para que SQLAlchemy registre las tablas en Base.metadata
from .usuario import Usuario
from .sede import Sede
from .registro_asistencia import RegistroAsistencia
from .offline_sync import OfflineSync
from .audit_log import AuditLog
from .red_empresa import RedEmpresa
from .reveal_request import RevealRequest
from .solicitud_app import SolicitudApp
from .solicitud_asistencia_manual import SolicitudAsistenciaManual
