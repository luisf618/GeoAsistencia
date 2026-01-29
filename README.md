# GeoAsistencia — README (Instalación completa + Web + APK Android)

Este documento explica **cómo usar el proyecto desde la carpeta**, levantar **base de datos + backend + web**, y cómo **generar e instalar el APK** (Flutter) para usarlo en tu celular.

> Zona horaria del proyecto: **BD en UTC** y visualización en **America/Guayaquil**.

---

## 1) Estructura del proyecto

En la carpeta principal deberías ver algo parecido a:

- `geoasistencia_app/`
  - `backend/` (FastAPI)
  - `frontend/` (React + Vite)
  - `mobile/` o `flutter/` (Flutter, si aplica)
- `scriptGeo.sql` (script de BD)

---

## 2) Requisitos

### PC (Windows)
- **Python 3.10+** (recomendado 3.11/3.12)
- **PostgreSQL** (local) y opcionalmente pgAdmin
- **Node.js 18+** (para el panel web)
- (Para APK) **Flutter** + **Android Studio** (SDK + Platform Tools)
- (Opcional) Git

### Celular Android
- Estar en la **misma red Wi‑Fi** que tu PC (para usar IP local).
- Permitir instalación de **“apps desconocidas”** para instalar el APK.

---

## 3) Base de datos (PostgreSQL)

### 3.1 Crear BD y cargar esquema
1. Crea una base de datos, por ejemplo: `geoasistencia`
2. Ejecuta `scriptGeo.sql` en esa BD.

> Si ya migraste columnas de fecha a `timestamptz` en UTC, perfecto.

### 3.2 Timezone recomendado (UTC)
Para evitar confusiones, deja la BD en UTC:

```sql
ALTER DATABASE geoasistencia SET timezone TO 'UTC';
```

Luego reconecta en pgAdmin.

> Postgres con `timestamptz` guarda el instante correctamente; solo “muestra” en la zona de la sesión.

---

## 4) Backend (FastAPI)

### 4.1 Abrir terminal en backend
En PowerShell, entra a:

```powershell
cd geoasistencia_app\backend
```

### 4.2 Instalar dependencias
```powershell
python -m pip install -r requirements.txt
```

> Si `uvicorn` no se reconoce, es normal en Windows si no está en PATH. Lo ejecutaremos con `python -m ...`.

### 4.3 Configurar conexión a BD
Busca tu archivo de configuración (suele ser uno de estos):
- `.env`
- `app/config.py`
- `app/settings.py`

Asegúrate de que el `DATABASE_URL` apunte a tu Postgres local, ejemplo:

```
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/geoasistencia
```

### 4.4 Levantar el backend (IMPORTANTE)
Para que funcione también desde el celular (misma red), usa `--host 0.0.0.0`:

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Debe salir:
- `Uvicorn running on http://0.0.0.0:8000`

### 4.5 Probar backend
En PC:
- http://127.0.0.1:8000/docs

En celular (misma Wi‑Fi):
- http://TU_IP:8000/docs

Para conocer tu IP en Windows:
```powershell
ipconfig
```
Busca **IPv4 Address**, ejemplo: `192.168.1.10`

---

## 5) Si el celular NO entra al backend: abrir el puerto 8000

En Windows:

1) “Firewall de Windows con seguridad avanzada”  
2) Reglas de entrada → Nueva regla…  
3) Puerto → TCP → **8000**  
4) Permitir conexión  
5) Perfil **Privada** (y/o Dominio)  
6) Nombre: `GeoAsistencia Backend 8000`

Vuelve a probar:
- http://TU_IP:8000/docs

---

## 6) Frontend Web (React + Vite)

### 6.1 Instalar y levantar
En otra terminal:

```powershell
cd geoasistencia_app\frontend
npm install
npm run dev
```

Abre en PC:
- http://localhost:5173

### 6.2 Abrir la web desde el celular (opcional)
Levanta Vite expuesto a red:

```powershell
npm run dev -- --host
```

Vite mostrará una URL “Network” tipo:
- http://192.168.1.10:5173

En el celular abre:
- http://TU_IP:5173

### 6.3 Importante: API base URL
Si el frontend usa una variable tipo `VITE_API_URL`, cuando abras desde el celular debe apuntar a:

- `http://TU_IP:8000`

(no `localhost`, porque en el celular “localhost” sería el teléfono).

---

## 7) Roles y uso básico de la aplicación

### Login
- Inicia sesión con correo y contraseña.
- **No se elige rol**: el rol viene del usuario en BD.

### Roles
- **SUPERADMIN**
  - Crea sedes
  - Crea admins
  - Ve todo
- **ADMIN**
  - Solo su sede
  - Gestiona empleados de su sede
  - Revisa/Aprueba/Rechaza solicitudes manuales
- **EMPLEADO**
  - Marca entrada/salida
  - Puede solicitar “marcación manual”

### LOPDP (Protección de datos)
- Los datos sensibles se muestran con verificación:
  - pide **motivo + contraseña**
  - acceso temporal (60s)
  - queda **auditado**

---

## 8) Marcaciones manuales (cómo funcionan)

### Empleado
- Entra al módulo de asistencia
- Elige “Marcación manual”
- Escribe detalle/motivo
- Envía solicitud (queda **PENDIENTE**)

> Si no hay ubicación, es válida: lat/long pueden ser null en manual.

### Admin/Superadmin
- Recibe como **Peticiones / Notificaciones**
- Puede:
  - Ver detalle (con verificación)
  - Aprobar o rechazar (con verificación)
- La acción queda registrada en **Auditoría**

---

## 9) APK Android (Flutter)

> Para APK necesitas que el backend esté corriendo y accesible desde tu celular (ver sección 4 y 5).

### 9.1 Verificar Flutter
En una terminal:
```bash
flutter doctor
```

### 9.2 Configurar el `baseUrl` (CRÍTICO)
Busca el archivo donde se define la URL del backend en Flutter. Suele estar en:
- `lib/core/config.dart`
- `lib/config.dart`
- `lib/services/api.dart`

Si ves:
```dart
static const String baseUrl = "http://10.0.2.2:8000";
```

⚠️ `10.0.2.2` es SOLO para emulador Android.

Para celular real cambia a tu IP:
```dart
static const String baseUrl = "http://192.168.1.10:8000";
```

### 9.3 Compilar APK Release
En la carpeta Flutter (donde está `pubspec.yaml`):

```bash
flutter clean
flutter pub get
flutter build apk --release
```

El APK queda en:
- `build/app/outputs/flutter-apk/app-release.apk`

### 9.4 Instalar en el celular
- Copia `app-release.apk` al teléfono (USB / Drive / WhatsApp)
- Permite “apps desconocidas” si te lo pide
- Instala y abre

### 9.5 Prueba rápida
Antes de abrir el APK, confirma en el celular:
- http://TU_IP:8000/docs

Si eso no abre, el APK tampoco podrá iniciar sesión.

---

## 10) Problemas comunes (soluciones rápidas)

### “uvicorn no se reconoce”
Ejecuta siempre así:
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### El celular no abre `http://TU_IP:8000/docs`
- PC y celular en misma Wi‑Fi
- Backend con `--host 0.0.0.0`
- Abrir puerto 8000 en firewall

### El APK abre pero no carga / no inicia sesión
- `baseUrl` sigue en `10.0.2.2`
- cambia a `http://TU_IP:8000`
- verifica `/docs` desde el celular

### Fechas corridas (±5h)
- BD debe estar en UTC con `timestamptz`
- frontend debe formatear con `America/Guayaquil`
- evita `toLocaleString()` sin timezone

---

## 11) Comandos útiles

Ver tu IP:
```powershell
ipconfig
```

Parar backend:
- CTRL + C

Levantar backend:
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Levantar frontend:
```powershell
npm run dev -- --host
```
