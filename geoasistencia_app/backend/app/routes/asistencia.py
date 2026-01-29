from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.models.sede import Sede
from app.models.registro_asistencia import RegistroAsistencia
from app.models.solicitud_asistencia_manual import SolicitudAsistenciaManual
from app.utils.geo import distancia_metros
from app.schemas.asistencia_schema import RegistroAsistenciaRequest
from app.security.jwt import decode_token
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _get_current_user_id(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token inválido")
    return sub


def _local_tz():
    return ZoneInfo("America/Guayaquil")


def _to_utc_naive(dt: datetime) -> datetime:
    """Normaliza un datetime a UTC *naive* (sin tzinfo).

    El frontend normalmente envía fechas sin offset (naive). En ese caso,
    asumimos hora local (America/Guayaquil) y convertimos a UTC.
    """

    if dt is None:
        return None

    tz = _local_tz()
    if dt.tzinfo is None:
        # Interpretar como hora local del sistema (Ecuador)
        dt = dt.replace(tzinfo=tz)
    # Convertir a UTC y quitar tzinfo para almacenar como "timestamp without time zone"
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _utc_bounds_for_local_day(days_ago: int = 0):
    tz = _local_tz()
    now_local = datetime.now(tz)
    d = (now_local.date() - timedelta(days=days_ago))
    start_local = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc

@router.post("/registro")
def registrar_asistencia(
    payload: RegistroAsistenciaRequest,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    # Auth mínima (MVP Semana 3)
    current_user_id = _get_current_user_id(authorization)
    if current_user_id != str(payload.usuario_id):
        raise HTTPException(status_code=403, detail="Usuario no autorizado")

    usuario = db.query(Usuario).filter(Usuario.usuario_id == payload.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    sede = db.query(Sede).filter(Sede.sede_id == usuario.sede_id).first()
    if not sede:
        raise HTTPException(status_code=400, detail="Usuario sin sede asignada")

    # ---
    # MODO MANUAL = SOLICITUD (requiere revisión de ADMIN/SUPERADMIN)
    # En modo manual NO se exige lat/lng (pueden ser None).
    # ---
    if payload.modo == "manual":
        if (payload.tipo or "").lower() not in {"entrada", "salida"}:
            raise HTTPException(status_code=400, detail="En modo manual, tipo debe ser entrada o salida")
        # Permitir que el empleado indique el momento del evento.
        # Guardamos SIEMPRE en UTC (naive) para evitar desfases (-5h) al renderizar.
        ts_evento = _to_utc_naive(payload.timestamp_registro) if payload.timestamp_registro else datetime.now(timezone.utc).replace(tzinfo=None)
        detalle = (payload.detalle or payload.evidence or "").strip()
        if len(detalle) < 15:
            raise HTTPException(status_code=400, detail="Detalle requerido (mínimo 15 caracteres)")

        sol = SolicitudAsistenciaManual(
            usuario_id=usuario.usuario_id,
            sede_id=sede.sede_id,
            tipo=(payload.tipo or "").lower(),
            timestamp_evento=ts_evento,
            latitud=payload.latitud,
            longitud=payload.longitud,
            device_info=payload.device_info,
            evidence=payload.evidence,
            detalle=detalle,
            estado="PENDIENTE",
        )
        db.add(sol)
        db.commit()
        return {
            "ok": True,
            "status": "PENDIENTE",
            "solicitud_id": str(sol.solicitud_id),
        }

    # ---
    # APP / SYNC_OFFLINE = registro directo (requiere geolocalización)
    # ---
    if payload.latitud is None or payload.longitud is None:
        raise HTTPException(status_code=422, detail="Latitud/longitud son obligatorias para marcación con geolocalización")

    dist = distancia_metros(
        float(payload.latitud), float(payload.longitud),
        float(sede.latitud), float(sede.longitud)
    )
    dentro = dist <= float(sede.radio_metros)

    # ---
    # ---
    # APP / SYNC_OFFLINE = registro directo
    # ---
    ts = None
    if payload.timestamp_registro is not None:
        # Solo permitimos override si el modo es manual.
        raise HTTPException(status_code=400, detail="timestamp_registro solo permitido en modo manual")

    registro = RegistroAsistencia(
        usuario_id=usuario.usuario_id,
        sede_id=sede.sede_id,
        tipo=payload.tipo,
        timestamp_registro=ts or datetime.utcnow(),
        latitud=payload.latitud,
        longitud=payload.longitud,
        dentro_geocerca=dentro,
        modo=payload.modo,
        device_info=payload.device_info,
        evidence=payload.evidence,
        ip_detectada=payload.ip_detectada,
        ssid_detectada=payload.ssid_detectada,
        bssid_detectada=payload.bssid_detectada,
    )

    db.add(registro)
    db.commit()

    return {"ok": True, "dentro_geocerca": dentro}


@router.get("/mis-registros")
def mis_registros(
    usuario_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    """Devuelve los últimos registros del empleado autenticado.
    Por privacidad, este endpoint solo aplica al propio usuario (no admins).
    """
    current_user_id = _get_current_user_id(authorization)
    if current_user_id != str(usuario_id):
        raise HTTPException(status_code=403, detail="Usuario no autorizado")

    limit = max(1, min(int(limit), 50))
    regs = (
        db.query(RegistroAsistencia)
        .filter(RegistroAsistencia.usuario_id == usuario_id)
        .order_by(RegistroAsistencia.timestamp_registro.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "registro_id": str(r.registro_id),
            "tipo": r.tipo,
            "timestamp_registro": r.timestamp_registro.isoformat(),
            "dentro_geocerca": bool(r.dentro_geocerca),
            "modo": r.modo,
        }
        for r in regs
    ]


@router.get("/dashboard")
def dashboard_empleado(
    db: Session = Depends(get_db),
    authorization: str = Header(default=""),
):
    """Resumen del empleado autenticado (para dashboard web)."""
    current_user_id = _get_current_user_id(authorization)

    start_utc, end_utc = _utc_bounds_for_local_day(0)
    regs_today = (
        db.query(RegistroAsistencia)
        .filter(
            RegistroAsistencia.usuario_id == current_user_id,
            RegistroAsistencia.timestamp_registro >= start_utc,
            RegistroAsistencia.timestamp_registro < end_utc,
        )
        .all()
    )
    entradas_hoy = sum(1 for r in regs_today if (r.tipo or "").lower() == "entrada")
    salidas_hoy = sum(1 for r in regs_today if (r.tipo or "").lower() == "salida")
    fuera_hoy = sum(1 for r in regs_today if r.dentro_geocerca is False)

    serie = []
    for i in range(6, -1, -1):
        s_utc, e_utc = _utc_bounds_for_local_day(i)
        regs = (
            db.query(RegistroAsistencia)
            .filter(
                RegistroAsistencia.usuario_id == current_user_id,
                RegistroAsistencia.timestamp_registro >= s_utc,
                RegistroAsistencia.timestamp_registro < e_utc,
            )
            .all()
        )
        entradas = sum(1 for r in regs if (r.tipo or "").lower() == "entrada")
        salidas = sum(1 for r in regs if (r.tipo or "").lower() == "salida")
        fuera = sum(1 for r in regs if r.dentro_geocerca is False)
        date_local = (datetime.now(_local_tz()).date() - timedelta(days=i)).isoformat()
        serie.append({"date": date_local, "entradas": entradas, "salidas": salidas, "fuera": fuera})

    return {
        "usuario_id": str(current_user_id),
        "entradas_hoy": entradas_hoy,
        "salidas_hoy": salidas_hoy,
        "fuera_geocerca_hoy": fuera_hoy,
        "serie_7d": serie,
    }
