#!/usr/bin/env bash
# نصب نگار روی اوبونتو/دبیان.
#   sudo bash install.sh
#   DOMAIN=example.com ADMIN_EMAIL=a@b.c ADMIN_PASSWORD='********' sudo -E bash install.sh
# به‌روزرسانی بدون پرسش دوباره:
#   sudo bash install.sh --upgrade
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "این اسکریپت را با sudo اجرا کنید."
  exit 1
fi

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${INSTALL_DIR:-/opt/site}"
UPGRADE=0
if [ "${1:-}" = "--upgrade" ]; then
  UPGRADE=1
fi

prompt() {
  local var="$1" text="$2" secret="${3:-}" def="${4:-}"
  if [ -n "${!var:-}" ]; then
    return
  fi
  local value=""
  if [ "$secret" = "1" ]; then
    read -r -s -p "$text" value
    echo
  elif [ -n "$def" ]; then
    read -r -p "$text [$def]: " value
    value="${value:-$def}"
  else
    read -r -p "$text" value
  fi
  printf -v "$var" '%s' "$value"
}

if [ "$UPGRADE" = "1" ] && [ -f "$DEST/backend/env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$DEST/backend/env"
  set +a
  DOMAIN="${DOMAIN:-${NEGAR_DOMAIN:-}}"
  ADMIN_EMAIL="${ADMIN_EMAIL:-${NEGAR_ADMIN_EMAIL:-}}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-${NEGAR_ADMIN_PASSWORD:-}}"
  SITE_NAME="${SITE_NAME:-${NEGAR_SITE_NAME:-نگار}}"
  WITH_WWW="${WITH_WWW:-1}"
else
  prompt DOMAIN "دامنه سایت (بدون https، مثلا example.com): "
  prompt SITE_NAME "نام سایت: " "" "نگار"
  prompt ADMIN_EMAIL "ایمیل مدیر: "
  prompt ADMIN_PASSWORD "رمز مدیر (حداقل ۸ نویسه): " 1
  prompt ADMIN_PASSWORD2 "تکرار رمز: " 1
  if [ "${ADMIN_PASSWORD}" != "${ADMIN_PASSWORD2:-$ADMIN_PASSWORD}" ]; then
    echo "رمزها یکی نیستند."
    exit 1
  fi
  prompt WITH_WWW "زیردامنه www هم اضافه شود؟ (1/0): " "" "1"
fi

DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"
DOMAIN="$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]')"
if ! echo "$DOMAIN" | grep -Eq '^[a-z0-9.-]+\.[a-z]{2,}$'; then
  echo "دامنه نامعتبر است: $DOMAIN"
  exit 1
fi
if [ "${#ADMIN_PASSWORD}" -lt 8 ]; then
  echo "رمز باید حداقل ۸ نویسه باشد."
  exit 1
fi
if ! echo "$ADMIN_EMAIL" | grep -Eq '^[^@]+@[^@]+\.[^@]+$'; then
  echo "ایمیل نامعتبر است."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl unzip git debian-keyring debian-archive-keyring apt-transport-https gnupg

if ! command -v go >/dev/null 2>&1 || ! go version | grep -Eq 'go1\.(2[7-9]|[3-9][0-9])'; then
  arch="$(uname -m)"
  case "$arch" in
    x86_64) goarch=amd64 ;;
    aarch64|arm64) goarch=arm64 ;;
    *) echo "معماری پشتیبانی نمی‌شود: $arch"; exit 1 ;;
  esac
  curl -fsSL -o /tmp/go.tgz "https://go.dev/dl/go1.27.3.linux-${goarch}.tar.gz"
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tgz
  ln -sfn /usr/local/go/bin/go /usr/local/bin/go
fi

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(2[2-9]|[3-9][0-9])'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

mkdir -p "$DEST"
if [ "$SRC" != "$DEST" ]; then
  tar -C "$SRC" \
    --exclude node_modules --exclude .next --exclude pb_data --exclude backend/bin \
    -cf - . | tar -C "$DEST" -xf -
fi

if ! id negar >/dev/null 2>&1; then
  useradd --system --home "$DEST" --shell /usr/sbin/nologin negar
fi

install -d -o negar -g negar "$DEST/pb_data" "$DEST/backend/bin"

umask 077
cat > "$DEST/backend/env" <<EOF
NEGAR_ADMIN_EMAIL=${ADMIN_EMAIL}
NEGAR_ADMIN_PASSWORD=${ADMIN_PASSWORD}
NEGAR_ADMIN_NAME=مدیر
NEGAR_SITE_NAME=${SITE_NAME}
NEGAR_DOMAIN=${DOMAIN}
NEGAR_PUBLIC_URL=https://${DOMAIN}
NEGAR_PLUGINS=${DEST}/plugins
EOF
chmod 600 "$DEST/backend/env"

cat > "$DEST/frontend/env" <<EOF
PB_INTERNAL_URL=http://127.0.0.1:8090
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
EOF

echo "ساخت بک‌اند..."
export PATH="/usr/local/go/bin:${PATH}"
cd "$DEST/backend"
go mod tidy
CGO_ENABLED=0 go build -o "$DEST/backend/bin/negar" .

echo "ساخت فرانت..."
cd "$DEST/frontend"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npm run build

chown -R negar:negar "$DEST"

cat > /etc/systemd/system/negar-api.service <<EOF
[Unit]
Description=Negar API (PocketBase)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=negar
Group=negar
WorkingDirectory=${DEST}/backend
EnvironmentFile=${DEST}/backend/env
ExecStart=${DEST}/backend/bin/negar serve --http=127.0.0.1:8090 --dir=${DEST}/pb_data
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/negar-web.service <<EOF
[Unit]
Description=Negar web
After=negar-api.service
Wants=negar-api.service

[Service]
Type=simple
User=negar
Group=negar
WorkingDirectory=${DEST}/frontend
EnvironmentFile=${DEST}/frontend/env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

HOSTS="$DOMAIN"
if [ "${WITH_WWW}" = "1" ]; then
  HOSTS="$DOMAIN, www.$DOMAIN"
fi
if [ -f /etc/caddy/Caddyfile ] && [ ! -f /etc/caddy/Caddyfile.negar.bak ]; then
  cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.negar.bak
fi
cat > /etc/caddy/Caddyfile <<EOF
{
  email ${ADMIN_EMAIL}
}

${HOSTS} {
  encode zstd gzip
  handle /pb/* {
    uri strip_prefix /pb
    reverse_proxy 127.0.0.1:8090
  }
  handle {
    reverse_proxy 127.0.0.1:3000
  }
}
EOF

systemctl daemon-reload
systemctl enable --now negar-api.service
systemctl restart negar-api.service
systemctl enable --now negar-web.service
systemctl restart negar-web.service
systemctl reload caddy || systemctl restart caddy

ok=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if curl -sf http://127.0.0.1:8090/api/negar/health >/dev/null; then
    ok=1
    break
  fi
  sleep 0.5
done

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

echo
if [ "$ok" = "1" ]; then
  echo "نصب تمام شد."
else
  echo "سرویس API هنوز جواب نداد. لاگ: journalctl -u negar-api -n 80 --no-pager"
fi
echo "سایت:    https://${DOMAIN}"
echo "مدیریت:  https://${DOMAIN}/master"
echo "ایمیل:   ${ADMIN_EMAIL}"
echo "پایگاه:  https://${DOMAIN}/pb/_/"
echo "به‌روزرسانی بعدی: sudo bash ${DEST}/install.sh --upgrade"
