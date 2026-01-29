# GeoAsistencia (Flutter + Backend)

## App (Flutter)
1) Instala dependencias:
   - `flutter pub get`

2) Si tu carpeta `android/` o `ios/` está vacía (en este ZIP viene vacía), genera los archivos de plataforma:
   - En la raíz del proyecto Flutter:
     - `flutter create .`
   Esto NO borra tu carpeta `lib/`. Solo genera scaffolding para compilar.

3) Ejecutar en emulador:
   - `flutter run`

4) Generar APK (release):
   - `flutter build apk --release`

> Nota: Para emulador Android, el backend debe estar en `http://10.0.2.2:8000`.
> Para dispositivo físico, cambia `lib/core/config.dart` a la IP de tu PC.

## Backend
- Entra a `backend/`
- Instala: `pip install -r requirements.txt`
- Ejecuta: `python run.py`

Recomendado: usa un `.env` con variables DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME.
