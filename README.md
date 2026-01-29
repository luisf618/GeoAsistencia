# GeoAsistencia · Instalación y uso (Web + Backend + Móvil)

Este proyecto incluye:

- **Backend (API):** FastAPI + SQLAlchemy + PostgreSQL.
- **Panel Web:** React + Vite (interfaz clara con dashboards).
- **Roles:** `EMPLEADO`, `ADMIN`, `SUPERADMIN`.
- **Privacidad por diseño (LOPDP):**
  - Listados **sin datos personales** (solo **códigos**).
  - Para ver detalle/PII: **motivo + reingreso de contraseña**, acceso temporal **60s**.
  - Acciones sensibles (editar usuarios, ajustar geocerca, aprobar/rechazar manuales) también requieren verificación (auditado).
  - **ADMIN** solo gestiona **su sede**; **SUPERADMIN** gestiona todas las sedes.

---

## 1) Requisitos

### Para Web + Backend
- **Python 3.10+**
- **Node.js LTS** (18+ recomendado)
- **PostgreSQL 16** (local) **o Docker** (recomendado)

### Para Móvil (opcional)
- **Flutter SDK**
- Android Studio (para emulador/SDK) o dispositivo Android físico

---

## 2) Estructura del proyecto

```
geoasistencia_app/
  backend/        # FastAPI
  frontend/       # React + Vite
  sql/            # scripts SQL extra (si aplica)
  lib/            # Flutter (opcional)
  android/ ios/   # Flutter plataformas
  docker-compose.yml
```

---

## 3) Base de datos (PostgreSQL)

El backend está configurado (por defecto) para conectarse a:

- Host: `127.0.0.1`
- Puerto: `5433`
- DB: `geoasistencia`
- Usuario: `geo_user`
- Pass: `GeoPass123`

> Esto está en `backend/app/database.py`.

### Opción A (recomendada): levantar Postgres con Docker

Desde la raíz `geoasistencia_app/`:

```bash
docker compose up -d db
```

Esto crea Postgres en `127.0.0.1:5433` con las credenciales anteriores.

### Opción B: Postgres local instalado

Si tu Postgres local corre en `5432`, tienes 2 opciones:

**B1) Cambiar el puerto en el backend**
- Abre `backend/app/database.py` y cambia `DB_PORT = 5432`.

**B2) Configurar Postgres para usar 5433**
- Cambia el `port` en `postgresql.conf` y reinicia el servicio.

Luego crea usuario y BD (si no existen):

```sql
CREATE USER geo_user WITH PASSWORD 'GeoPass123';
CREATE DATABASE geoasistencia OWNER geo_user;
```

---

## 4) Nota importante de zona horaria (recomendado)

Para evitar el típico corrimiento de **5 horas** (Ecuador), lo recomendado es:

- Guardar timestamps en la BD como **`timestamptz` en UTC**.
- Mostrar en la UI con **`America/Guayaquil`**.

Si en tu BD ves columnas como `timestamp without time zone`, puedes migrarlas a `timestamptz`.

✅ Si tus datos actuales estaban guardados como **UTC pero sin tz**, ejecuta (ejemplo):

```sql
ALTER TABLE public.registro_asistencia
  ALTER COLUMN timestamp_registro TYPE timestamptz
  USING timestamp_registro AT TIME ZONE 'UTC';
```

Haz lo mismo para otras columnas de fechas (auditoría, usuarios, etc.).

---

## 5) Backend (FastAPI)

### 5.1) Instalar dependencias

En Windows PowerShell / CMD:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

En Linux/Mac:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### 5.2) Crear tablas y datos demo

El backend crea tablas automáticamente (SQLAlchemy) al arrancar. Además, ejecuta el seed:

```bash
python seed.py
```

### 5.3) Levantar API

```bash
python run.py
```

- API: `http://localhost:8000`
- Health: `http://localhost:8000/health`

> `run.py` ya levanta en `0.0.0.0:8000`, útil para móviles.

---

## 6) Frontend (Panel Web)

### 6.1) Instalar y ejecutar en desarrollo

```bash
cd frontend
npm install
npm run dev
```

- Web: `http://localhost:5173`

### 6.2) Abrir el frontend desde tu celular (modo dev)

1) Averigua la IP de tu PC en la red (ej: `192.168.1.10`).
2) Levanta Vite exponiendo la red:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

3) En tu celular (misma Wi‑Fi), abre:

- `http://IP_DE_TU_PC:5173`

> Si no carga, revisa firewall de Windows y permite el puerto 5173.

---

## 7) Usuarios demo (login)

- SUPERADMIN: `superadmin@geoasistencia.com` / `SuperAdmin12345`
- ADMIN: `admin@geoasistencia.com` / `Admin12345`
- EMPLEADO: `empleado@empresa.com` / `Empleado12345`

> El login **no pide rol**: el backend lo detecta automáticamente.

---

## 8) Módulo de asistencias manuales (solicitudes)

- El **Empleado** puede enviar una **solicitud manual** (entrada/salida) con detalle.
- El **Admin** recibe **notificación** (badge) y puede:
  - Ver detalle (requiere verificación 60s)
  - **Aprobar/Rechazar** (requiere verificación 60s) con comentario de decisión
- Todo queda en **Auditoría**.

---

## 9) Producción: servir el frontend desde el backend

Si quieres que todo corra desde **un solo puerto** (`8000`):

1) Compila el frontend y lo copia al backend:

```bash
# desde geoasistencia_app/
./build_frontend.sh
```

En Windows, puedes usar:

```powershell
bash .\build_frontend.sh
```

2) Levanta backend:

```bash
cd backend
python run.py
```

3) Abre:

- `http://localhost:8000`

Y desde celular:

- `http://IP_DE_TU_PC:8000`

---

## 10) App móvil Flutter (opcional)

> Si solo quieres **web en móvil**, puedes saltarte esta sección.

### 10.1) Configurar URL del backend

Edita:

- `lib/core/config.dart`

Casos:
- **Emulador Android:** `http://10.0.2.2:8000`
- **Celular físico (misma red):** `http://IP_DE_TU_PC:8000`

Ejemplo:

```dart
static const String baseUrl = 'http://192.168.1.10:8000';
```

### 10.2) Ejecutar en emulador / dispositivo

```bash
flutter pub get
flutter run
```

### 10.3) Generar APK

```bash
flutter build apk --release
```

---

## 11) Solución de problemas

### 11.1) No conecta a Postgres
- Confirma que Postgres está activo.
- Si usas Docker, debe estar en `127.0.0.1:5433`.
- Si usas Postgres local en 5432, cambia `DB_PORT` en `backend/app/database.py`.

### 11.2) No abre desde el celular
- Celular y PC deben estar en la **misma Wi‑Fi**.
- Ejecuta Vite con `--host 0.0.0.0`.
- Permite puertos en firewall (5173 y/o 8000).

### 11.3) Horas corridas (+5h / -5h)
- Recomendado: BD con `timestamptz` en UTC.
- UI debe formatear con `America/Guayaquil`.

### 11.4) Leaflet / mapa no carga
Si te aparece error de imports Leaflet:

```bash
cd frontend
npm i leaflet react-leaflet
```

---

## 12) Seguridad (nota)

En desarrollo, el backend permite CORS `*`. En producción, lo ideal es restringir `allow_origins` a tu dominio.

---
