#!/usr/bin/env bash
# اجرای محلی برای توسعه. تولید روی سرور با install.sh است.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-me-now}"
export SITE_TITLE="${SITE_TITLE:-نگار}"
export DOMAIN="${DOMAIN:-localhost}"
export PB_DATA="${PB_DATA:-${ROOT}/backend/pb_data}"
export PLUGINS_DIR="${PLUGINS_DIR:-${ROOT}/plugins}"
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:8090}"
echo "API روی http://127.0.0.1:8090"
echo "در ترمینال دیگر: cd frontend && npm install && npm run dev"
echo "پنل: http://127.0.0.1:3000/master"
echo "ورود آزمایشی: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}"
cd "${ROOT}/backend"
exec go run . serve --http=127.0.0.1:8090 --dir="${PB_DATA}"
