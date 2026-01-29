# GeoAsistencia · Web (Empleado / Admin / SuperAdmin)

Este proyecto trae:
- **Backend**: FastAPI + SQLAlchemy + Postgres
- **Frontend Web**: React + Vite + Tailwind (UI limpia + dashboards con color informativo)
- **Roles**: `EMPLEADO`, `ADMIN`, `SUPERADMIN`
- **LOPDP (Privacidad por diseño)**:
  - Listados **sin datos personales** (solo códigos + máscaras)
  - Revelar PII **empleado por empleado** exige **justificación + reingreso de contraseña**
  - Acceso temporal **60s** + **auditoría** automática
  - Operaciones sensibles (editar usuario / ajustar geocerca) también requieren **verificación 60s** (motivo + contraseña)
  - **Verificación extra** para acciones sensibles (editar usuarios / ajustar geocerca): motivo + contraseña (token 60s)
  - Admin solo ve y gestiona su **sede** (usuarios y métricas)

Además:
- Página de inicio con **"Solicitar la aplicación"** (guarda solicitudes en DB)
- Login **sin elegir rol** (el backend lo detecta)
- Código de empleado **autogenerado** (EMP-XXX-XXXX) actualizable solo por lógica, no manual

## 1) Requisitos
- Node.js LTS (para el frontend)
- Python 3.10+
- Docker (recomendado) para Postgres

## 2) Levantar Base de Datos (Postgres)
Con Docker:
```bash
docker compose up -d db
```
Esto crea Postgres en `127.0.0.1:5433` con:
- user: `geo_user`
- pass: `GeoPass123`
- db: `geoasistencia`

## 3) Ejecutar Backend
```bash
cd backend
python -m pip install -r requirements.txt
python seed.py
python run.py
```
Backend: `http://localhost:8000`

## 4) Ejecutar Frontend (modo desarrollo)
```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

> El frontend usa proxy de Vite hacia el backend, por eso puedes llamar a `/auth`, `/admin`, `/asistencia` directo.
> También: `/solicitudes` (formulario de la página de inicio).

## 5) Login (usuarios demo)
- SUPERADMIN: `superadmin@geoasistencia.com` / `SuperAdmin12345`
- ADMIN: `admin@geoasistencia.com` / `Admin12345`
- EMPLEADO: `empleado@empresa.com` / `Empleado12345`

## 6) Producción: servir frontend desde FastAPI
Compila y copia el frontend al backend:
```bash
./build_frontend.sh
```
Luego levanta backend y abre:
- `http://localhost:8000`

> El frontend usa **HashRouter**, así que no requiere configuración especial de rutas.

## 7) Qué verás en la UI
### Empleado
- Marcar **Entrada/Salida** con geolocalización
- Ver resumen (hoy + última semana)

### Admin / SuperAdmin
- Usuarios listados por **código** (sin PII)
- Dashboard con métricas de asistencias (hoy + serie 7 días) y tabla de asistencias recientes
- Modal **Revelar PII** con:
  - Justificación
  - Reingreso de contraseña
  - Temporizador 60s
- Auditoría
- (Admin) **Mi sede**: ajustar geocerca con **mapa interactivo** (clic para mover el pin) + radio/dirección (solo su sede)
- (Solo SuperAdmin) CRUD de sedes

---

Si quieres que también se agregue:
- recuperación de contraseña
- bloqueo por intentos
- 2FA
- multiempresa
se puede extender sobre esta base.
