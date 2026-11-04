#!/usr/bin/env bash
# ساخت باینری Go و خروجی مستقل Next.js. از install.sh و «site rebuild» صدا زده می‌شود.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/usr/local/go/bin:/usr/local/bin:${PATH}"

if [[ -f /etc/site/site.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/site/site.env
  set +a
fi

mkdir -p "${ROOT}/bin"
echo "ساخت سرویس Go…"
(
  cd "${ROOT}/backend"
  CGO_ENABLED=0 go build -trimpath -o "${ROOT}/bin/site-api" .
)

echo "ساخت فرانت Next.js…"
(
  cd "${ROOT}/frontend"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:8090}"
  export NEXT_PUBLIC_SITE_URL="${PUBLIC_URL:-http://127.0.0.1:3000}"
  npm run build
  mkdir -p .next/standalone/.next .next/standalone/content
  rm -rf .next/standalone/public
  cp -a public .next/standalone/public
  cp -a .next/static .next/standalone/.next/static
  if [[ -d content ]]; then
    cp -a content/. .next/standalone/content/
  fi
)

echo "ساخت تمام شد."
