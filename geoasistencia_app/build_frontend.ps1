$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "frontend")

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm no encontrado. Instala Node.js (LTS)."
  exit 1
}

npm install
npm run build

Set-Location $PSScriptRoot
if (Test-Path "backend/app/static/web") { Remove-Item -Recurse -Force "backend/app/static/web" }
New-Item -ItemType Directory -Force -Path "backend/app/static/web" | Out-Null
Copy-Item -Recurse -Force "frontend/dist/*" "backend/app/static/web/"

Write-Host "✅ Frontend compilado y copiado a backend/app/static/web"
