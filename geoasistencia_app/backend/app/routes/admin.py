from __future__ import annotations

import uuid
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.usuario import Usuario
from app.models.sede import Sede
from app.models.audit_log import AuditLog
from app.models.registro_asistencia import RegistroAsistencia
from app.models.solicitud_asistencia_manual import SolicitudAsistenciaManual
from app.models.reveal_request import RevealRequest
from app.models.registro_asistencia import RegistroAsistencia
from app.schemas.admin_schema import (
    AdminLoginRequest,
    SedeCreate,
    SedeUpdate,
    UsuarioCreate,
    UsuarioUpdate,
    RevealPIIRequest,
    ActionVerifyRequest,
)
from app.security.deps import get_db, get_current_user, require_roles
from app.security.hash import verify_password, hash_password
from app.security.jwt import create_token, decode_token
from app.utils.geo import distancia_metros


router = APIRouter()


def _role(u: Usuario) -> str:
    return (u.rol or "").upper()


def _mask_email(email: str) -> str:
    try:
        name, domain = email.split("@", 1)
    except ValueError:
        return "***"
    if len(name) <= 1:
        return "*@" + domain
    return name[0] + "***@" + domain


def _sede_tag(sede: Sede) -> str:
    """Etiqueta corta para componer códigos."""
    if not sede:
        return "GEN"
    name = (sede.nombre or "").strip().upper()
    name = re.sub(r"[^A-Z0-9]+", "", name)
    if len(name) >= 3:
        return name[:3]
    # fallback: 3 chars del UUID
    sid = str(sede.sede_id).replace("-", "").upper()
    return (name + sid)[:3]


def _gen_codigo_empleado(db: Session, sede: Sede) -> str:
    """Genera un código tipo EMP-LOJ-4F8C (único)."""
    tag = _sede_tag(sede)
    for _ in range(20):
        suf = uuid.uuid4().hex[:4].upper()
        code = f"EMP-{tag}-{suf}"
        exists = db.query(Usuario).filter(Usuario.documento == code).first()
        if not exists:
            return code
    # fallback improbable
    return f"EMP-{tag}-{uuid.uuid4().hex[:6].upper()}"


def _require_action_token(user: Usuario, token: str, expected_action: str):
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Action token inválido")

    if payload.get("scope") != "action":
        raise HTTPException(status_code=403, detail="Token no autorizado")
    if payload.get("action") != expected_action:
        raise HTTPException(status_code=403, detail="Token no corresponde a la acción")
    if payload.get("sub") != str(user.usuario_id):
        raise HTTPException(status_code=403, detail="Token no corresponde al usuario")



@router.post("/login")
def login_admin(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if _role(user) not in {"ADMIN", "SUPERADMIN"}:
        raise HTTPException(status_code=403, detail="Este usuario no tiene acceso al panel")

    token = create_token({"sub": str(user.usuario_id), "role": _role(user), "scope": "admin"})
    return {
        "token": token,
        "usuario_id": str(user.usuario_id),
        "rol": _role(user),
        "sede_id": str(user.sede_id) if user.sede_id else None,
    }


@router.get("/me")
def me(user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN"))):
    return {
        "usuario_id": str(user.usuario_id),
        "rol": _role(user),
        "sede_id": str(user.sede_id) if user.sede_id else None,
        "codigo": user.documento,
    }



# ----------------------
# VERIFICACIÓN DE ACCIONES (60s)
# - Se usa para operaciones sensibles: editar usuario / ajustar geocerca.
# ----------------------


@router.post("/actions/verify")
def verify_action(
    payload: ActionVerifyRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    action = (payload.action or "").upper().strip()
    if action not in {"USER_EDIT", "SEDE_EDIT", "ATTENDANCE_VIEW", "MANUAL_REVIEW"}:
        raise HTTPException(status_code=400, detail="Acción no soportada")

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="action",
            entidad_id=user.usuario_id,
            accion="ACTION_VERIFY",
            detalle={"action": action, "motivo": payload.motivo, "ttl_seconds": 60},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    token = create_token(
        {"sub": str(user.usuario_id), "role": _role(user), "scope": "action", "action": action},
        expires_in_seconds=60,
    )
    return {"action_token": token, "expires_in": 60}


# ----------------------
# MI SEDE (ADMIN / SUPERADMIN)
# - ADMIN: solo puede ver/ajustar la geocerca de su sede
# - SUPERADMIN: puede usar /sedes para gestión total
# ----------------------


@router.get("/mi-sede")
def mi_sede(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    if not user.sede_id:
        raise HTTPException(status_code=400, detail="Usuario sin sede asignada")

    sede = db.query(Sede).filter(Sede.sede_id == user.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    return {
        "sede_id": str(sede.sede_id),
        "nombre": sede.nombre,
        "latitud": sede.latitud,
        "longitud": sede.longitud,
        "radio_metros": sede.radio_metros,
        "direccion": sede.direccion,
    }


@router.put("/mi-sede")
def actualizar_mi_sede(
    payload: SedeUpdate,
    action_token: str = Header(None, alias="X-Action-Token"),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    if not user.sede_id:
        raise HTTPException(status_code=400, detail="Usuario sin sede asignada")

    sede = db.query(Sede).filter(Sede.sede_id == user.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # Verificación extra para cambios sensibles (coordenadas/radio)
    if not action_token:
        raise HTTPException(status_code=401, detail="Se requiere verificación (X-Action-Token)")
    _require_action_token(user, action_token, "SEDE_EDIT")

    before = {
        "latitud": sede.latitud,
        "longitud": sede.longitud,
        "radio_metros": sede.radio_metros,
        "direccion": sede.direccion,
    }

    updates = payload.model_dump(exclude_unset=True)
    updates.pop("documento", None)  # código no se edita manualmente
    # ADMIN: solo geocerca/dirección de su sede (no renombrar sede)
    if _role(user) == "ADMIN":
        updates.pop("nombre", None)

    allowed = {"latitud", "longitud", "radio_metros", "direccion", "nombre"}
    for k, v in updates.items():
        if k in allowed:
            setattr(sede, k, v)

    db.commit()

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="sede",
            entidad_id=sede.sede_id,
            accion="UPDATE_GEOFENCE" if _role(user) == "ADMIN" else "UPDATE",
            detalle={"before": before, "after": updates},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    return {"ok": True}


# ----------------------
# DASHBOARD (ADMIN / SUPERADMIN)
# - Datos agregados (sin PII) para hacerlo útil e informativo
# ----------------------


def _local_tz():
    # Ecuador
    return ZoneInfo("America/Guayaquil")


def _utc_bounds_for_local_day(days_ago: int = 0):
    tz = _local_tz()
    now_local = datetime.now(tz)
    d = (now_local.date() - timedelta(days=days_ago))
    start_local = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc


@router.get("/dashboard")
def dashboard(
    sede_id: str | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    role = _role(user)

    # ADMIN: solo su sede
    if role == "ADMIN":
        if not user.sede_id:
            raise HTTPException(status_code=400, detail="Usuario sin sede asignada")
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id  # opcional (si no viene, es global)

    start_utc, end_utc = _utc_bounds_for_local_day(0)

    # Usuarios visibles
    q_users = db.query(Usuario).filter(Usuario.rol.in_(["EMPLEADO", "Colaborador", "colaborador", "empleado"]))
    if sede_target_id:
        q_users = q_users.filter(Usuario.sede_id == sede_target_id)
    total_empleados = q_users.count()

    # Asistencias hoy
    q_today = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.timestamp_registro >= start_utc,
        RegistroAsistencia.timestamp_registro < end_utc,
    )
    if sede_target_id:
        q_today = q_today.filter(RegistroAsistencia.sede_id == sede_target_id)

    regs_today = q_today.all()
    entradas_hoy = sum(1 for r in regs_today if (r.tipo or "").lower() == "entrada")
    salidas_hoy = sum(1 for r in regs_today if (r.tipo or "").lower() == "salida")
    fuera_hoy = sum(1 for r in regs_today if r.dentro_geocerca is False)

    # Serie 7 días
    serie = []
    for i in range(6, -1, -1):
        s_utc, e_utc = _utc_bounds_for_local_day(i)
        q = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.timestamp_registro >= s_utc,
            RegistroAsistencia.timestamp_registro < e_utc,
        )
        if sede_target_id:
            q = q.filter(RegistroAsistencia.sede_id == sede_target_id)
        regs = q.all()
        entradas = sum(1 for r in regs if (r.tipo or "").lower() == "entrada")
        salidas = sum(1 for r in regs if (r.tipo or "").lower() == "salida")
        fuera = sum(1 for r in regs if r.dentro_geocerca is False)
        date_local = (datetime.now(_local_tz()).date() - timedelta(days=i)).isoformat()
        serie.append({"date": date_local, "entradas": entradas, "salidas": salidas, "fuera": fuera})

    return {
        "scope": "sede" if sede_target_id else "global",
        "sede_id": sede_target_id,
        "total_empleados": total_empleados,
        "entradas_hoy": entradas_hoy,
        "salidas_hoy": salidas_hoy,
        "fuera_geocerca_hoy": fuera_hoy,
        "serie_7d": serie,
    }


@router.get("/asistencias")
def asistencias_recientes(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    limit = max(1, min(int(limit), 100))

    # Solo registros de empleados (no ADMIN/SUPERADMIN)
    q = (
        db.query(RegistroAsistencia, Usuario)
        .join(Usuario, Usuario.usuario_id == RegistroAsistencia.usuario_id)
        .filter(Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]))
    )
    if _role(user) == "ADMIN":
        q = q.filter(RegistroAsistencia.sede_id == user.sede_id)

    rows = (
        q.order_by(RegistroAsistencia.timestamp_registro.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "registro_id": str(r.registro_id),
            "timestamp_registro": r.timestamp_registro.isoformat() if r.timestamp_registro else None,
            "tipo": (r.tipo or "").lower(),
            "dentro_geocerca": bool(r.dentro_geocerca) if r.dentro_geocerca is not None else None,
            "modo": r.modo,
            "usuario_codigo": u.documento,
            "sede_id": str(r.sede_id) if r.sede_id else None,
        }
        for (r, u) in rows
    ]



@router.get("/asistencias/list")
def asistencias_listado(
    range: str = "week",
    date: str | None = None,
    sede_id: str | None = None,
    documento: str | None = None,
    codigo: str | None = None,
    offset: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    """Listado completo de asistencias dentro de un rango (día/semana/mes).

    - ADMIN: solo su sede
    - SUPERADMIN: puede filtrar por sede_id o ver todas
    - Siempre excluye usuarios ADMIN/SUPERADMIN (solo empleados).
    """
    role = _role(user)
    if role == "ADMIN":
        if not user.sede_id:
            raise HTTPException(status_code=400, detail="Usuario sin sede asignada")
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id

    range_name, start_date, end_date, start_utc, end_utc = _utc_bounds_for_local_range(range, date)

    offset = max(0, int(offset))
    limit = max(1, min(int(limit), 500))

    base_q = (
        db.query(RegistroAsistencia, Usuario, Sede)
        .join(Usuario, Usuario.usuario_id == RegistroAsistencia.usuario_id)
        .join(Sede, Sede.sede_id == RegistroAsistencia.sede_id)
        .filter(
            RegistroAsistencia.timestamp_registro >= start_utc,
            RegistroAsistencia.timestamp_registro < end_utc,
            Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]),
        )
    )
    if sede_target_id:
        base_q = base_q.filter(RegistroAsistencia.sede_id == sede_target_id)

    # Filtro por "documento/código" (por privacidad, se usa el código interno del empleado)
    q_code = (codigo or documento or "").strip()
    if q_code:
        base_q = base_q.filter(Usuario.documento.ilike(f"%{q_code}%"))

    total = base_q.count()

    rows = (
        base_q.order_by(RegistroAsistencia.timestamp_registro.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for r, u, sd in rows:
        local_dt = _to_local(r.timestamp_registro) if r.timestamp_registro else None
        items.append(
            {
                "registro_id": str(r.registro_id),
                "timestamp_registro": r.timestamp_registro.isoformat() if r.timestamp_registro else None,
                "local_date": local_dt.date().isoformat() if local_dt else None,
                "local_time": local_dt.strftime("%H:%M:%S") if local_dt else None,
                "tipo": (r.tipo or "").lower(),
                "dentro_geocerca": bool(r.dentro_geocerca) if r.dentro_geocerca is not None else None,
                "modo": r.modo,
                "usuario_codigo": u.documento,
                "sede_id": str(r.sede_id) if r.sede_id else None,
                "sede_nombre": sd.nombre if sd else None,
            }
        )

    return {
        "range": range_name,
        "from": start_date.isoformat(),
        "to": (end_date - timedelta(days=1)).isoformat(),
        "offset": offset,
        "limit": limit,
        "total": total,
        "items": items,
    }


@router.get("/asistencias/{registro_id}/detalle")
def asistencia_detalle(
    registro_id: str,
    action_token: str = Header(None, alias="X-Action-Token"),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    """Detalle de un registro de asistencia.

    Por privacidad (LOPDP), el detalle requiere:
    - verificación (contraseña + motivo) => action_token 60s

    Además:
    - ADMIN: solo puede acceder a registros de su sede.
    - Nunca devuelve PII (nombre/email), solo el código del empleado.
    """
    if not action_token:
        raise HTTPException(status_code=401, detail="Se requiere verificación (X-Action-Token)")
    _require_action_token(user, action_token, "ATTENDANCE_VIEW")

    row = (
        db.query(RegistroAsistencia, Usuario, Sede)
        .join(Usuario, Usuario.usuario_id == RegistroAsistencia.usuario_id)
        .join(Sede, Sede.sede_id == RegistroAsistencia.sede_id)
        .filter(RegistroAsistencia.registro_id == registro_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    r, u, sd = row
    if _role(u) in {"ADMIN", "SUPERADMIN"}:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if _role(user) == "ADMIN" and str(r.sede_id) != str(user.sede_id):
        raise HTTPException(status_code=403, detail="No autorizado")

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="registro_asistencia",
            entidad_id=r.registro_id,
            accion="VIEW_DETAIL",
            detalle={"motivo": "verificado", "codigo": u.documento},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    local_dt = _to_local(r.timestamp_registro) if r.timestamp_registro else None
    return {
        "registro_id": str(r.registro_id),
        "tipo": (r.tipo or "").lower(),
        "modo": r.modo,
        "timestamp_registro": r.timestamp_registro.isoformat() if r.timestamp_registro else None,
        "local_date": local_dt.date().isoformat() if local_dt else None,
        "local_time": local_dt.strftime("%H:%M:%S") if local_dt else None,
        "usuario_codigo": u.documento,
        "sede": {
            "sede_id": str(sd.sede_id),
            "nombre": sd.nombre,
        },
        "geo": {
            "latitud": r.latitud,
            "longitud": r.longitud,
            "dentro_geocerca": bool(r.dentro_geocerca) if r.dentro_geocerca is not None else None,
        },
        "device_info": r.device_info,
        "evidence": r.evidence,
        "ip_detectada": r.ip_detectada,
        "ssid_detectada": r.ssid_detectada,
        "bssid_detectada": r.bssid_detectada,
    }


@router.get("/asistencias/reporte")
def reporte_asistencias_empleado(
    documento: str,
    month: str,
    sede_id: str | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    """Reporte de asistencias de un empleado por mes.

    - Filtra por código (documento) del empleado.
    - Devuelve el listado completo del mes + conteos útiles.
    """
    code = (documento or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="documento es requerido")
    try:
        y, m = month.split("-", 1)
        year = int(y)
        mon = int(m)
        if mon < 1 or mon > 12:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="month debe ser YYYY-MM")

    role = _role(user)
    if role == "ADMIN":
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id

    # rango local del mes
    tz = _local_tz()
    start_date = datetime(year, mon, 1, tzinfo=tz).date()
    if mon == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=tz).date()
    else:
        end_date = datetime(year, mon + 1, 1, tzinfo=tz).date()
    start_local = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=tz)
    end_local = datetime(end_date.year, end_date.month, end_date.day, 0, 0, 0, tzinfo=tz)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)

    q = (
        db.query(RegistroAsistencia, Usuario, Sede)
        .join(Usuario, Usuario.usuario_id == RegistroAsistencia.usuario_id)
        .join(Sede, Sede.sede_id == RegistroAsistencia.sede_id)
        .filter(
            RegistroAsistencia.timestamp_registro >= start_utc,
            RegistroAsistencia.timestamp_registro < end_utc,
            Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]),
            Usuario.documento == code,
        )
    )
    if sede_target_id:
        q = q.filter(RegistroAsistencia.sede_id == sede_target_id)

    rows = q.order_by(RegistroAsistencia.timestamp_registro.asc()).all()
    items = []
    days_with_any = set()
    entradas = 0
    salidas = 0
    for r, u, sd in rows:
        local_dt = _to_local(r.timestamp_registro) if r.timestamp_registro else None
        if local_dt:
            days_with_any.add(local_dt.date().isoformat())
        t = (r.tipo or "").lower()
        if t == "entrada":
            entradas += 1
        elif t == "salida":
            salidas += 1
        items.append(
            {
                "registro_id": str(r.registro_id),
                "timestamp_registro": r.timestamp_registro.isoformat() if r.timestamp_registro else None,
                "local_date": local_dt.date().isoformat() if local_dt else None,
                "local_time": local_dt.strftime("%H:%M:%S") if local_dt else None,
                "tipo": t,
                "dentro_geocerca": bool(r.dentro_geocerca) if r.dentro_geocerca is not None else None,
                "modo": r.modo,
                "usuario_codigo": u.documento,
                "sede_nombre": sd.nombre if sd else None,
            }
        )

    return {
        "documento": code,
        "month": f"{year:04d}-{mon:02d}",
        "total_registros": len(items),
        "total_dias_con_registro": len(days_with_any),
        "entradas": entradas,
        "salidas": salidas,
        "items": items,
    }


# ----------------------
# SOLICITUDES DE ASISTENCIA MANUAL (ADMIN / SUPERADMIN)
# - El EMPLEADO genera solicitudes en /asistencia/registro (modo=manual)
# - El ADMIN debe revisarlas y decidir (aprobar/rechazar)
# ----------------------


@router.get("/manual-asistencias")
def manual_asistencias_list(
    status: str = "pendiente",
    range: str = "week",
    date: str | None = None,
    sede_id: str | None = None,
    documento: str | None = None,
    offset: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    status = (status or "pendiente").upper()
    if status not in {"PENDIENTE", "APROBADA", "RECHAZADA"}:
        raise HTTPException(status_code=400, detail="status debe ser pendiente|aprobada|rechazada")

    role = _role(user)
    if role == "ADMIN":
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id

    range_name, start_date, end_date, start_utc, end_utc = _utc_bounds_for_local_range(range, date)

    offset = max(0, int(offset))
    limit = max(1, min(int(limit), 500))

    q = (
        db.query(SolicitudAsistenciaManual, Usuario, Sede)
        .join(Usuario, Usuario.usuario_id == SolicitudAsistenciaManual.usuario_id)
        .join(Sede, Sede.sede_id == SolicitudAsistenciaManual.sede_id)
        .filter(
            SolicitudAsistenciaManual.created_at >= start_utc,
            SolicitudAsistenciaManual.created_at < end_utc,
            SolicitudAsistenciaManual.estado == status,
            Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]),
        )
    )
    if sede_target_id:
        q = q.filter(SolicitudAsistenciaManual.sede_id == sede_target_id)

    code = (documento or "").strip()
    if code:
        q = q.filter(Usuario.documento.ilike(f"%{code}%"))

    total = q.count()
    rows = (
        q.order_by(SolicitudAsistenciaManual.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for sol, u, sd in rows:
        local_dt = _to_local(sol.timestamp_evento) if sol.timestamp_evento else None
        items.append(
            {
                "solicitud_id": str(sol.solicitud_id),
                "estado": sol.estado,
                "tipo": (sol.tipo or "").lower(),
                "timestamp_evento": sol.timestamp_evento.isoformat() if sol.timestamp_evento else None,
                "local_date": local_dt.date().isoformat() if local_dt else None,
                "local_time": local_dt.strftime("%H:%M:%S") if local_dt else None,
                "usuario_codigo": u.documento,
                "sede_id": str(sd.sede_id),
                "sede_nombre": sd.nombre,
                "created_at": sol.created_at.isoformat() if sol.created_at else None,
            }
        )

    return {
        "range": range_name,
        "from": start_date.isoformat(),
        "to": (end_date - timedelta(days=1)).isoformat(),
        "offset": offset,
        "limit": limit,
        "total": total,
        "items": items,
    }





@router.get("/manual-asistencias/count")
def manual_asistencias_count(
    status: str = "pendiente",
    sede_id: str | None = None,
    documento: str | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    """Conteo rápido de solicitudes manuales (para notificaciones).

    - ADMIN: solo su sede
    - SUPERADMIN: puede filtrar por sede_id o ver todas
    - Excluye solicitudes de usuarios ADMIN/SUPERADMIN
    """

    status = (status or "pendiente").upper()
    if status not in {"PENDIENTE", "APROBADA", "RECHAZADA"}:
        raise HTTPException(status_code=400, detail="status debe ser pendiente|aprobada|rechazada")

    role = _role(user)
    if role == "ADMIN":
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id

    q = (
        db.query(SolicitudAsistenciaManual, Usuario)
        .join(Usuario, Usuario.usuario_id == SolicitudAsistenciaManual.usuario_id)
        .filter(
            SolicitudAsistenciaManual.estado == status,
            Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]),
        )
    )
    if sede_target_id:
        q = q.filter(SolicitudAsistenciaManual.sede_id == sede_target_id)

    code = (documento or "").strip()
    if code:
        q = q.filter(Usuario.documento.ilike(f"%{code}%"))

    return {"status": status.lower(), "count": q.count()}


@router.get("/manual-asistencias/{solicitud_id}/detalle")
def manual_asistencia_detalle(
    solicitud_id: str,
    action_token: str = Header(None, alias="X-Action-Token"),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    if not action_token:
        raise HTTPException(status_code=401, detail="Se requiere verificación (X-Action-Token)")
    _require_action_token(user, action_token, "ATTENDANCE_VIEW")

    row = (
        db.query(SolicitudAsistenciaManual, Usuario, Sede)
        .join(Usuario, Usuario.usuario_id == SolicitudAsistenciaManual.usuario_id)
        .join(Sede, Sede.sede_id == SolicitudAsistenciaManual.sede_id)
        .filter(SolicitudAsistenciaManual.solicitud_id == solicitud_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    sol, u, sd = row
    if _role(u) in {"ADMIN", "SUPERADMIN"}:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if _role(user) == "ADMIN" and str(sol.sede_id) != str(user.sede_id):
        raise HTTPException(status_code=403, detail="No autorizado")

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="solicitud_asistencia_manual",
            entidad_id=sol.solicitud_id,
            accion="VIEW_DETAIL",
            detalle={"estado": sol.estado, "codigo": u.documento},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    local_dt = _to_local(sol.timestamp_evento) if sol.timestamp_evento else None
    return {
        "solicitud_id": str(sol.solicitud_id),
        "estado": sol.estado,
        "tipo": (sol.tipo or "").lower(),
        "timestamp_evento": sol.timestamp_evento.isoformat() if sol.timestamp_evento else None,
        "local_date": local_dt.date().isoformat() if local_dt else None,
        "local_time": local_dt.strftime("%H:%M:%S") if local_dt else None,
        "usuario_codigo": u.documento,
        "sede": {"sede_id": str(sd.sede_id), "nombre": sd.nombre},
        "detalle": sol.detalle,
        "geo": {"latitud": sol.latitud, "longitud": sol.longitud},
        "device_info": sol.device_info,
        "evidence": sol.evidence,
        "created_at": sol.created_at.isoformat() if sol.created_at else None,
        "review": {
            "revisado_por": str(sol.revisado_por) if sol.revisado_por else None,
            "revisado_at": sol.revisado_at.isoformat() if sol.revisado_at else None,
            "decision_comentario": sol.decision_comentario,
        },
    }


from pydantic import BaseModel, Field


class ManualDecision(BaseModel):
    decision: str = Field(..., pattern="^(approve|reject)$")
    comentario: str | None = None


@router.post("/manual-asistencias/{solicitud_id}/decide")
def manual_asistencia_decide(
    solicitud_id: str,
    payload: ManualDecision,
    action_token: str = Header(None, alias="X-Action-Token"),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    if not action_token:
        raise HTTPException(status_code=401, detail="Se requiere verificación (X-Action-Token)")
    _require_action_token(user, action_token, "MANUAL_REVIEW")

    sol = db.query(SolicitudAsistenciaManual).filter(SolicitudAsistenciaManual.solicitud_id == solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    # ADMIN: solo su sede
    if _role(user) == "ADMIN" and str(sol.sede_id) != str(user.sede_id):
        raise HTTPException(status_code=403, detail="No autorizado")

    if (sol.estado or "").upper() != "PENDIENTE":
        raise HTTPException(status_code=409, detail="La solicitud ya fue procesada")

    decision = (payload.decision or "").lower()
    comentario = (payload.comentario or "").strip() if payload.comentario else None

    # cargar sede para calcular geocerca al aprobar
    sede = db.query(Sede).filter(Sede.sede_id == sol.sede_id).first()
    if not sede:
        raise HTTPException(status_code=400, detail="Sede no encontrada")

    if decision == "approve":
        try:
            dist = distancia_metros(
                float(sol.latitud), float(sol.longitud),
                float(sede.latitud), float(sede.longitud)
            ) if sol.latitud is not None and sol.longitud is not None else None
        except Exception:
            dist = None
        dentro = None
        if dist is not None:
            dentro = dist <= float(sede.radio_metros)

        reg = RegistroAsistencia(
            usuario_id=sol.usuario_id,
            sede_id=sol.sede_id,
            tipo=(sol.tipo or "").lower(),
            timestamp_registro=sol.timestamp_evento or datetime.utcnow(),
            latitud=sol.latitud,
            longitud=sol.longitud,
            dentro_geocerca=dentro,
            modo="manual",
            device_info=sol.device_info,
            evidence=sol.evidence,
        )
        db.add(reg)
        sol.estado = "APROBADA"
        action = "APPROVE"
    else:
        sol.estado = "RECHAZADA"
        action = "REJECT"

    sol.revisado_por = user.usuario_id
    sol.revisado_at = datetime.utcnow()
    sol.decision_comentario = comentario

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="solicitud_asistencia_manual",
            entidad_id=sol.solicitud_id,
            accion=f"MANUAL_{action}",
            detalle={"comentario": comentario},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    return {"ok": True, "estado": sol.estado}


# ----------------------
# ASISTENCIAS - RESÚMENES (ADMIN / SUPERADMIN)
# - Día / Semana / Mes
# - Totales: asistidos / tarde / faltas
# - Faltantes: empleados sin ENTRADA en la fecha seleccionada
#
# Nota (MVP): "tarde" se calcula con una regla por defecto (08:10)
# hasta que exista configuración de horarios por sede.
# ----------------------


LATE_CUTOFF_HOUR = 8
LATE_CUTOFF_MINUTE = 10


def _to_local(dt_value: datetime) -> datetime:
    """Convierte un datetime a hora local (America/Guayaquil).

    Soporta valores naive (assumidos en UTC) y aware (se convierte según tzinfo).
    """

    tz = _local_tz()
    if dt_value is None:
        return None

    if dt_value.tzinfo is None:
        dt_value = dt_value.replace(tzinfo=timezone.utc)
    else:
        dt_value = dt_value.astimezone(timezone.utc)

    return dt_value.astimezone(tz)


def _utc_bounds_for_local_range(range_name: str, date_str: str | None):
    tz = _local_tz()
    base_date = datetime.now(tz).date()
    if date_str:
        try:
            base_date = datetime.fromisoformat(date_str).date()
        except Exception:
            raise HTTPException(status_code=400, detail="date debe ser YYYY-MM-DD")

    range_name = (range_name or "week").lower()
    if range_name not in {"day", "week", "month"}:
        raise HTTPException(status_code=400, detail="range debe ser day|week|month")

    if range_name == "day":
        start_date = base_date
        end_date = base_date + timedelta(days=1)
    elif range_name == "week":
        # Lunes a domingo
        start_date = base_date - timedelta(days=base_date.weekday())
        end_date = start_date + timedelta(days=7)
    else:
        start_date = base_date.replace(day=1)
        # primer día del siguiente mes
        if start_date.month == 12:
            end_date = start_date.replace(year=start_date.year + 1, month=1)
        else:
            end_date = start_date.replace(month=start_date.month + 1)

    start_local = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=tz)
    end_local = datetime(end_date.year, end_date.month, end_date.day, 0, 0, 0, tzinfo=tz)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)
    return range_name, start_date, end_date, start_utc, end_utc


def _employees_query(db: Session, sede_target_id: str | None):
    q = db.query(Usuario).filter(Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]))
    if sede_target_id:
        q = q.filter(Usuario.sede_id == sede_target_id)
    return q


@router.get("/asistencias/resumen")
def asistencias_resumen(
    range: str = "week",
    date: str | None = None,
    sede_id: str | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    role = _role(user)
    # ADMIN: solo su sede
    if role == "ADMIN":
        if not user.sede_id:
            raise HTTPException(status_code=400, detail="Usuario sin sede asignada")
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id

    range_name, start_date, end_date, start_utc, end_utc = _utc_bounds_for_local_range(range, date)

    empleados = _employees_query(db, sede_target_id).all()
    empleados_ids = {str(e.usuario_id) for e in empleados}

    # Registros de ENTRADA en el rango (solo no-admin)
    q = (
        db.query(RegistroAsistencia, Usuario)
        .join(Usuario, Usuario.usuario_id == RegistroAsistencia.usuario_id)
        .filter(
            RegistroAsistencia.timestamp_registro >= start_utc,
            RegistroAsistencia.timestamp_registro < end_utc,
            (RegistroAsistencia.tipo == "entrada"),
            Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]),
        )
    )
    if sede_target_id:
        q = q.filter(RegistroAsistencia.sede_id == sede_target_id)

    rows = q.all()

    # first entrada por (date, usuario)
    first_entry = {}  # (iso_date, user_id) -> local_dt
    for r, u in rows:
        if not r.timestamp_registro:
            continue
        u_id = str(u.usuario_id)
        if u_id not in empleados_ids:
            continue
        local_dt = _to_local(r.timestamp_registro)
        iso_date = local_dt.date().isoformat()
        key = (iso_date, u_id)
        prev = first_entry.get(key)
        if prev is None or local_dt < prev:
            first_entry[key] = local_dt

    cutoff = datetime(2000, 1, 1, LATE_CUTOFF_HOUR, LATE_CUTOFF_MINUTE).time()

    serie = []
    totals_asistidos = 0
    totals_tarde = 0
    totals_faltas = 0

    d = start_date
    while d < end_date:
        iso = d.isoformat()
        present = 0
        late = 0
        for e in empleados:
            k = (iso, str(e.usuario_id))
            dt_local = first_entry.get(k)
            if dt_local is not None:
                present += 1
                if dt_local.time() > cutoff:
                    late += 1
        faltas = max(0, len(empleados) - present)
        serie.append({"date": iso, "asistidos": present, "tarde": late, "faltas": faltas})
        totals_asistidos += present
        totals_tarde += late
        totals_faltas += faltas
        d = d + timedelta(days=1)

    # Para el panel, usamos la fecha seleccionada para detalle (por defecto: hoy)
    detail_date = (datetime.now(_local_tz()).date() if not date else datetime.fromisoformat(date).date()).isoformat()

    faltantes = []
    tarde_list = []
    for e in empleados:
        k = (detail_date, str(e.usuario_id))
        dt_local = first_entry.get(k)
        if dt_local is None:
            faltantes.append({"usuario_id": str(e.usuario_id), "codigo": e.documento, "sede_id": str(e.sede_id) if e.sede_id else None})
        else:
            if dt_local.time() > cutoff:
                tarde_list.append({"usuario_id": str(e.usuario_id), "codigo": e.documento, "hora": dt_local.time().strftime("%H:%M")})

    return {
        "range": range_name,
        "from": start_date.isoformat(),
        "to": (end_date - timedelta(days=1)).isoformat(),
        "scope": "sede" if sede_target_id else "global",
        "sede_id": sede_target_id,
        "rule_late_after": f"{LATE_CUTOFF_HOUR:02d}:{LATE_CUTOFF_MINUTE:02d}",
        "empleados": len(empleados),
        "totales": {
            "asistidos": totals_asistidos,
            "tarde": totals_tarde,
            "faltas": totals_faltas,
        },
        "serie": serie,
        "detalle": {
            "date": detail_date,
            "empleados": len(empleados),
            "asistidos": max(0, len(empleados) - len(faltantes)),
            "tarde_count": len(tarde_list),
            "faltas_count": len(faltantes),
            "faltantes": faltantes,
            "tarde": tarde_list,
        },
    }


@router.get("/asistencias/faltantes")
def asistencias_faltantes(
    date: str | None = None,
    sede_id: str | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    role = _role(user)
    if role == "ADMIN":
        sede_target_id = str(user.sede_id)
    else:
        sede_target_id = sede_id

    tz = _local_tz()
    d = datetime.now(tz).date()
    if date:
        try:
            d = datetime.fromisoformat(date).date()
        except Exception:
            raise HTTPException(status_code=400, detail="date debe ser YYYY-MM-DD")

    start_local = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)

    empleados = _employees_query(db, sede_target_id).all()
    empleados_ids = {str(e.usuario_id) for e in empleados}

    q = db.query(RegistroAsistencia.usuario_id).filter(
        RegistroAsistencia.timestamp_registro >= start_utc,
        RegistroAsistencia.timestamp_registro < end_utc,
        (RegistroAsistencia.tipo == "entrada"),
    )
    if sede_target_id:
        q = q.filter(RegistroAsistencia.sede_id == sede_target_id)

    present_ids = {str(x[0]) for x in q.distinct().all()}
    faltantes = [
        {"usuario_id": str(e.usuario_id), "codigo": e.documento, "sede_id": str(e.sede_id) if e.sede_id else None}
        for e in empleados
        if str(e.usuario_id) in empleados_ids and str(e.usuario_id) not in present_ids
    ]
    return {"date": d.isoformat(), "count": len(faltantes), "items": faltantes}


# ----------------------
# DASHBOARD (ADMIN / SUPERADMIN)
# ----------------------
# SEDES (solo SUPERADMIN)
# ----------------------


@router.get("/sedes")
def list_sedes(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_roles("SUPERADMIN")),
):
    sedes = db.query(Sede).order_by(Sede.created_at.desc()).all()
    return [
        {
            "sede_id": str(s.sede_id),
            "nombre": s.nombre,
            "latitud": s.latitud,
            "longitud": s.longitud,
            "radio_metros": s.radio_metros,
            "direccion": s.direccion,
        }
        for s in sedes
    ]


@router.post("/sedes")
def create_sede(
    payload: SedeCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("SUPERADMIN")),
    req: Request = None,
):
    sede = Sede(
        sede_id=uuid.uuid4(),
        nombre=payload.nombre,
        latitud=payload.latitud,
        longitud=payload.longitud,
        radio_metros=payload.radio_metros,
        direccion=payload.direccion,
    )
    db.add(sede)
    db.commit()
    db.refresh(sede)

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="sede",
            entidad_id=sede.sede_id,
            accion="CREATE",
            detalle={"nombre": sede.nombre},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    return {"sede_id": str(sede.sede_id)}


@router.put("/sedes/{sede_id}")
def update_sede(
    sede_id: str,
    payload: SedeUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("SUPERADMIN")),
    req: Request = None,
):
    sede = db.query(Sede).filter(Sede.sede_id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    before = {
        "nombre": sede.nombre,
        "latitud": sede.latitud,
        "longitud": sede.longitud,
        "radio_metros": sede.radio_metros,
        "direccion": sede.direccion,
    }

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(sede, k, v)

    db.commit()

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="sede",
            entidad_id=sede.sede_id,
            accion="UPDATE",
            detalle={"before": before, "after": payload.model_dump(exclude_unset=True)},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    return {"ok": True}


# ----------------------
# USUARIOS (ADMIN / SUPERADMIN)
# - Por defecto: respuesta sin PII (email/telefono/nombre)
# - PII solo vía token temporal de 60s con justificación + reauth
# ----------------------


@router.get("/usuarios")
def list_usuarios(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
):
    # Regla de visibilidad:
    # - SUPERADMIN: puede ver todos los usuarios (sin PII en este listado)
    # - ADMIN: SOLO puede ver EMPLEADOS de SU sede (nunca ADMIN/SUPERADMIN)
    q = db.query(Usuario)
    if _role(user) == "ADMIN":
        if not user.sede_id:
            raise HTTPException(status_code=400, detail="Usuario sin sede asignada")
        q = q.filter(
            Usuario.sede_id == user.sede_id,
            Usuario.rol.notin_(["ADMIN", "SUPERADMIN"]),
        )

    usuarios = q.order_by(Usuario.created_at.desc()).all()
    return [
        {
            "usuario_id": str(u.usuario_id),
            "codigo": u.documento,
            "rol": _role(u),
            "sede_id": str(u.sede_id) if u.sede_id else None,
            # por privacidad: solo máscara
            "email_mask": _mask_email(u.email),
        }
        for u in usuarios
    ]



@router.post("/usuarios")
def create_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    role_actor = _role(user)
    role_new = (payload.rol or "").upper()

    # ADMIN: solo puede crear EMPLEADO dentro de su sede
    if role_actor == "ADMIN":
        if role_new != "EMPLEADO":
            raise HTTPException(status_code=403, detail="Un ADMIN solo puede crear EMPLEADOS")
        sede_id = user.sede_id
    else:
        # SUPERADMIN: puede crear cualquier rol y asignar sede
        sede_id = payload.sede_id

    if not sede_id:
        raise HTTPException(status_code=400, detail="sede_id es requerido")

    sede = db.query(Sede).filter(Sede.sede_id == str(sede_id)).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # Email único
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email ya existe")

    # Código autogenerado (no manual) para EMPLEADO
    codigo = payload.documento
    if role_new == "EMPLEADO":
        codigo = _gen_codigo_empleado(db, sede)
    else:
        # Para otros roles, si no envían documento, generamos uno simple.
        if not codigo:
            pref = "ADM" if role_new == "ADMIN" else "SUP" if role_new == "SUPERADMIN" else "USR"
            codigo = f"{pref}-{uuid.uuid4().hex[:6].upper()}"

    u = Usuario(
        usuario_id=uuid.uuid4(),
        documento=codigo,
        nombre_real=payload.nombre_real,
        email=payload.email,
        telefono=payload.telefono,
        password_hash=hash_password(payload.password),
        sede_id=sede.sede_id,
        rol=role_new,
        consentimiento_geolocalizacion=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="usuario",
            entidad_id=u.usuario_id,
            accion="CREATE",
            detalle={
                "codigo": u.documento,
                "rol": _role(u),
                "sede_id": str(u.sede_id),
            },
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    return {"usuario_id": str(u.usuario_id)}


@router.put("/usuarios/{usuario_id}")
def update_usuario(
    usuario_id: str,
    payload: UsuarioUpdate,
    action_token: str = Header(None, alias="X-Action-Token"),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    target = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if _role(user) == "ADMIN":
        # ADMIN: solo su sede y solo EMPLEADOS
        if target.sede_id != user.sede_id:
            raise HTTPException(status_code=403, detail="No puedes editar usuarios de otra sede")
        if (target.rol or "").upper() in {"ADMIN", "SUPERADMIN"}:
            raise HTTPException(status_code=403, detail="No puedes editar usuarios administrativos")

    if not action_token:
        raise HTTPException(status_code=401, detail="Se requiere verificación (X-Action-Token)")
    _require_action_token(user, action_token, "USER_EDIT")

    # ADMIN no puede cambiar roles ni mover de sede
    updates = payload.model_dump(exclude_unset=True)
    updates.pop("documento", None)  # código no se edita manualmente
    if _role(user) == "ADMIN":
        updates.pop("rol", None)
        updates.pop("sede_id", None)

    before = {"documento": target.documento, "rol": target.rol, "sede_id": str(target.sede_id)}

    if "password" in updates and updates["password"]:
        target.password_hash = hash_password(updates.pop("password"))

    # Manejar sede_id si viene
    if "sede_id" in updates and updates["sede_id"]:
        sede = db.query(Sede).filter(Sede.sede_id == updates["sede_id"]).first()
        if not sede:
            raise HTTPException(status_code=404, detail="Sede no encontrada")
        target.sede_id = sede.sede_id
        updates.pop("sede_id")

    for k, v in updates.items():
        if k == "rol" and v:
            setattr(target, k, v.upper())
        else:
            setattr(target, k, v)

    db.commit()

    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="usuario",
            entidad_id=target.usuario_id,
            accion="UPDATE",
            detalle={"before": before, "after": payload.model_dump(exclude_unset=True)},
            ip=getattr(req.client, "host", None) if req else None,
        )
    )
    db.commit()

    return {"ok": True}


# ----------------------
# REVELAR PII (60s)
# ----------------------


@router.post("/privacy/reveal")
def reveal_pii(
    payload: RevealPIIRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    req: Request = None,
):
    # Re-autenticación: pedir contraseña de nuevo
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    target = db.query(Usuario).filter(Usuario.usuario_id == payload.target_usuario_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if _role(user) == "ADMIN":
        if target.sede_id != user.sede_id:
            raise HTTPException(status_code=403, detail="Solo puedes ver empleados de tu sede")
        if (target.rol or "").upper() in {"ADMIN", "SUPERADMIN"}:
            raise HTTPException(status_code=403, detail="No puedes revelar PII de usuarios administrativos")

    # Registrar solicitud
    rr = RevealRequest(
        reveal_id=uuid.uuid4(),
        solicitante_id=user.usuario_id,
        motivo=payload.motivo,
    )
    db.add(rr)

    # Auditoría
    db.add(
        AuditLog(
            actor_usuario_id=user.usuario_id,
            entidad="usuario",
            entidad_id=target.usuario_id,
            accion="PII_REVEAL_GRANTED",
            detalle={
                "target_usuario_id": str(target.usuario_id),
                "motivo": payload.motivo,
                "ttl_seconds": 60,
            },
            ip=getattr(req.client, "host", None) if req else None,
        )
    )

    db.commit()

    reveal_token = create_token(
        {
            "sub": str(user.usuario_id),
            "scope": "reveal_pii",
            "target_usuario_id": str(target.usuario_id),
            "actor_role": _role(user),
        },
        expires_in_seconds=60,
    )

    return {"reveal_token": reveal_token, "expires_in": 60}


@router.get("/privacy/usuarios/{usuario_id}/pii")
def get_pii_usuario(usuario_id: str, request: Request, db: Session = Depends(get_db)):
    # Este endpoint SOLO acepta reveal_token (60s)
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta token")

    token = auth.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")

    if payload.get("scope") != "reveal_pii":
        raise HTTPException(status_code=403, detail="Token sin permisos")

    if payload.get("target_usuario_id") != usuario_id:
        raise HTTPException(status_code=403, detail="Token no coincide con el empleado")

    target = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Devolvemos PII mínima necesaria
    return {
        "usuario_id": str(target.usuario_id),
        "codigo": target.documento,
        "nombre_real": target.nombre_real,
        "email": target.email,
        "telefono": target.telefono,
        "sede_id": str(target.sede_id) if target.sede_id else None,
        "rol": _role(target),
    }


# ----------------------
# AUDITORÍA
# ----------------------


@router.get("/audit")
def list_audit(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("ADMIN", "SUPERADMIN")),
    limit: int = 100,
):
    limit = max(1, min(int(limit), 300))
    q = db.query(AuditLog).order_by(AuditLog.timestamp.desc())

    if _role(user) == "ADMIN":
        # Admin ve solo logs de su sede: filtramos por entidad usuario y luego por sede
        # (aprox: se filtra al vuelo; para producción conviene join)
        logs = q.limit(limit).all()
        filtered = []
        for l in logs:
            if l.entidad == "usuario" and l.entidad_id:
                tu = db.query(Usuario).filter(Usuario.usuario_id == l.entidad_id).first()
                if tu and tu.sede_id == user.sede_id:
                    filtered.append(l)
            elif l.entidad == "sede" and user.sede_id and l.entidad_id == user.sede_id:
                filtered.append(l)
        logs = filtered[:limit]
    else:
        logs = q.limit(limit).all()

    return [
        {
            "audit_id": str(l.audit_id),
            "timestamp": (l.timestamp.replace(tzinfo=timezone.utc) if getattr(l.timestamp, "tzinfo", None) is None else l.timestamp).isoformat(),
            "actor_usuario_id": str(l.actor_usuario_id) if l.actor_usuario_id else None,
            "entidad": l.entidad,
            "entidad_id": str(l.entidad_id) if l.entidad_id else None,
            "accion": l.accion,
            "detalle": l.detalle,
            "ip": l.ip,
        }
        for l in logs
    ]
