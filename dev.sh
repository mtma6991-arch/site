#!/usr/bin/env bash
# اجرای محلی بدون دامنه. پنل: http://127.0.0.1:3000/master
# ورود پیش‌فرض: admin@example.com / admin12345
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export NEGAR_ADMIN_EMAIL="${NEGAR_ADMIN_EMAIL:-admin@example.com}"
export NEGAR_ADMIN_PASSWORD="${NEGAR_ADMIN_PASSWORD:-admin12345}"
export NEGAR_ADMIN_NAME="${NEGAR_ADMIN_NAME:-مدیر}"
export NEGAR_SITE_NAME="${NEGAR_SITE_NAME:-نگار}"
export NEGAR_PUBLIC_URL="${NEGAR_PUBLIC_URL:-http://127.0.0.1:8090}"
export NEGAR_PLUGINS="$ROOT/plugins"
export PB_INTERNAL_URL="http://127.0.0.1:8090"
export NEXT_PUBLIC_PB_URL="http://127.0.0.1:8090"

cd "$ROOT/backend"
go build -o "$ROOT/backend/bin/negar" .
"$ROOT/backend/bin/negar" serve --http=127.0.0.1:8090 --dir="$ROOT/pb_data" &
pid=$!
trap 'kill "$pid" 2>/dev/null || true' EXIT
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then npm install; fi
echo "مدیریت: http://127.0.0.1:3000/master"
echo "ورود: $NEGAR_ADMIN_EMAIL / $NEGAR_ADMIN_PASSWORD"
npm run dev
