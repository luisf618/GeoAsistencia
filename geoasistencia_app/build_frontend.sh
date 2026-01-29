#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/frontend"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm no encontrado. Instala Node.js (LTS) para continuar." >&2
  exit 1
fi

npm install
npm run build

cd ..
rm -rf backend/app/static/web
mkdir -p backend/app/static/web
cp -r frontend/dist/* backend/app/static/web/

echo "✅ Frontend compilado y copiado a backend/app/static/web"
