#!/usr/bin/env bash
set -euo pipefail

# 1) DB
if command -v docker >/dev/null 2>&1; then
  docker compose up -d db
else
  echo "Docker no encontrado. Levanta tu Postgres en 127.0.0.1:5433 (geo_user/GeoPass123, DB geoasistencia)." >&2
fi

# 2) Backend
cd "$(dirname "$0")/backend"
python -m pip install -r requirements.txt
python seed.py

# 3) Run servers (2 terminals recommended)
echo "\nAhora abre 2 terminales:\n  A) Backend:  cd backend && python run.py\n  B) Frontend: cd frontend && npm install && npm run dev\n"
