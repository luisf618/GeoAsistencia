# GeoAsistencia — Instalación rápida (Backend para celular + APK Android)

Este README está centrado en:
1) Levantar el **backend** para que el **celular** lo pueda usar (misma red Wi-Fi)
2) Configurar Flutter con la **IP del PC** y generar el **APK**

---

## Requisitos

### En tu PC (Windows)
- Python 3.10+ (recomendado 3.11/3.12)
- PostgreSQL (local) + pgAdmin (opcional)
- (Para APK) Flutter + Android Studio (SDK)

### En tu celular Android
- Estar en la misma red Wi-Fi que tu PC
- Permitir “instalar apps desconocidas” para instalar el APK

---

## 1) Base de datos (PostgreSQL local)

1) Crea una base de datos (ej: `geoasistencia`)
2) Ejecuta el script:
- `scriptGeo.sql`

> Si ya migraste fechas a `timestamptz` en UTC, perfecto.

---

## 2) Backend (FastAPI) accesible desde el celular

### 2.1 Instalar dependencias
En PowerShell, dentro de `geoasistencia_app/backend`:

```powershell
python -m pip install -r requirements.txt
