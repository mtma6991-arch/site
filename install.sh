#!/usr/bin/env bash
# نصب نگار روی اوبونتو/دبیان.
#   sudo bash install.sh
#   DOMAIN=example.com ADMIN_EMAIL=a@b.c ADMIN_PASSWORD='********' sudo -E bash install.sh
# به‌روزرسانی بدون پرسش دوباره:
#   sudo bash install.sh --upgrade
#
# Go و Node و Caddy از بایگانی رسمی گرفته می‌شوند، نه از NodeSource و نه از
# مخزن apt کلودسمیت. آن دو منبع در ترمینال سیل ۴۰۴ می‌سازند. اگر یک آینه
# ۴۰۴ بدهد، اسکریپت خطا را نشان نمی‌دهد و آینهٔ بعدی را امتحان می‌کند.
# ماژول‌های Go داخل backend/vendor هستند؛ go mod tidy اجرا نمی‌شود.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "این اسکریپت را با sudo اجرا کنید."
  exit 1
fi

GO_VERSION="1.27.3"
NODE_VERSION="22.23.4"
CADDY_VERSION="2.11.9"

declare -A GO_SHA=(
  [amd64]="65efbc80fdc1fa2cd2631cad5b481777a68e8725f34e89f50fc6ac714e379b40"
  [arm64]="a06e99309dbcbdca1a8ccd2282c3ee146e55930886e26b4f1193269587165f49"
)
declare -A NODE_SHA=(
  [x64]="1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce"
  [arm64]="6287aa46b6c375d816e63ae66d024fbbfd70404825aabdfdf898a970871d2f4b"
)
declare -A CADDY_SHA512=(
  [amd64]="3379dbb17ecce723b6cb07a3341a9b921bd38548b370df65f6cdae0eb8b6424d1fd1db37cb4ee02649d253d06cba0580e9d649d3f54e895ae10066e88ae127f9"
  [arm64]="ee0cb331e8d7e4306b56e2ff874cfdc467245115727be18fea0b0212af74c520cd6fea1fa895e7ebf55472ee9604b3e866816913f10f66ee92212de874650a03"
)

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

# فایل env را بدون eval می‌خواند تا $ داخل رمز، موقع ارتقا خراب نشود.
load_env_file() {
  local file="$1" line key val
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    val="${line#*=}"
    case "$key" in
      NEGAR_DOMAIN|NEGAR_ADMIN_EMAIL|NEGAR_ADMIN_PASSWORD|NEGAR_SITE_NAME|NEGAR_PUBLIC_URL) ;;
      *) continue ;;
    esac
    if [ "${#val}" -ge 2 ] && [ "${val:0:1}" = '"' ] && [ "${val: -1}" = '"' ]; then
      val="${val:1:$((${#val} - 2))}"
      val="${val//\\\"/\"}"
      val="${val//\\\\/\\}"
    fi
    printf -v "$key" '%s' "$val"
  done < "$file"
}

# مقدار را برای EnvironmentFile سیستم‌دی امن می‌کند.
env_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/}"
  printf '%s' "$s"
}

# دانلود خاموش. ۴۰۴ و صفحهٔ HTML به‌جای فایل، فقط یعنی «این منبع نه» و می‌رود سراغ بعدی.
fetch_checked() {
  local dest="$1" algo="$2" want="$3"
  shift 3
  local url
  rm -f "$dest"
  for url in "$@"; do
    echo "  · ${url}"
    if curl -fL --silent --retry 2 --retry-delay 1 --connect-timeout 20 --max-time 300 \
      -A "negar-install/1" -o "$dest" "$url"; then
      if [ -s "$dest" ] && echo "${want}  ${dest}" | "${algo}sum" -c --status -; then
        echo "  دریافت و جمع‌آزما درست بود."
        return 0
      fi
      echo "  این آدرس فایل درست نداد (اغلب صفحهٔ ۴۰۴ با کد ۲۰۰). منبع بعدی."
    else
      echo "  این منبع در دسترس نیست."
    fi
    rm -f "$dest"
  done
  return 1
}

if [ "$UPGRADE" = "1" ] && [ -f "$DEST/backend/env" ]; then
  load_env_file "$DEST/backend/env"
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

case "$(uname -m)" in
  x86_64) GOARCH=amd64; NODEARCH=x64; CADDYARCH=amd64 ;;
  aarch64|arm64) GOARCH=arm64; NODEARCH=arm64; CADDYARCH=arm64 ;;
  *) echo "معماری پشتیبانی نمی‌شود: $(uname -m)"; exit 1 ;;
esac

# لیست apt نسخهٔ قبلی (Cloudsmith) روی خیلی از سرورها ۴۰۴های پشت‌سرهم می‌دهد.
rm -f /etc/apt/sources.list.d/caddy-stable.list \
  /etc/apt/sources.list.d/caddy-testing.list \
  /etc/apt/sources.list.d/caddy-stable.sources \
  /usr/share/keyrings/caddy-stable-archive-keyring.gpg \
  /usr/share/keyrings/caddy-testing-archive-keyring.gpg

export DEBIAN_FRONTEND=noninteractive
echo "به‌روزرسانی فهرست بسته‌های سیستم..."
if ! apt-get update -qq; then
  echo "هشدار: apt-get update خطا داد. اگر بالا پر از ۴۰۴ است، یک خط خراب در /etc/apt/sources.list.d دارید."
  echo "ادامه می‌دهیم؛ بسته‌های پایه باید از مخزن اصلی سیستم بیایند."
fi
apt-get install -y ca-certificates curl xz-utils

export PATH="/usr/local/go/bin:/usr/local/bin:${PATH}"

if ! command -v go >/dev/null 2>&1 || ! go version | grep -Eq 'go1\.(2[7-9]|[3-9][0-9])'; then
  echo "نصب Go ${GO_VERSION}..."
  fetch_checked /tmp/go.tgz sha256 "${GO_SHA[$GOARCH]}" \
    "https://dl.google.com/go/go${GO_VERSION}.linux-${GOARCH}.tar.gz" \
    "https://go.dev/dl/go${GO_VERSION}.linux-${GOARCH}.tar.gz" \
    "https://mirrors.aliyun.com/golang/go${GO_VERSION}.linux-${GOARCH}.tar.gz" \
    "https://mirrors.ustc.edu.cn/golang/go${GO_VERSION}.linux-${GOARCH}.tar.gz" \
    "https://mirrors.cloud.tencent.com/go/go${GO_VERSION}.linux-${GOARCH}.tar.gz" \
    || { echo "دانلود Go شکست خورد. هیچ آینه‌ای فایل سالم نداد."; exit 1; }
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tgz
  rm -f /tmp/go.tgz
  ln -sfn /usr/local/go/bin/go /usr/local/bin/go
  ln -sfn /usr/local/go/bin/gofmt /usr/local/bin/gofmt
  hash -r
  go version
fi

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v(2[2-9]|[3-9][0-9])\.'; then
  echo "نصب Node.js ${NODE_VERSION}..."
  fetch_checked /tmp/node.tar.xz sha256 "${NODE_SHA[$NODEARCH]}" \
    "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODEARCH}.tar.xz" \
    "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODEARCH}.tar.xz" \
    "https://mirrors.aliyun.com/nodejs-release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODEARCH}.tar.xz" \
    "https://mirrors.cloud.tencent.com/nodejs-release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODEARCH}.tar.xz" \
    || { echo "دانلود Node شکست خورد. هیچ آینه‌ای فایل سالم نداد."; exit 1; }
  rm -rf /usr/local/lib/nodejs
  mkdir -p /usr/local/lib/nodejs
  tar -C /usr/local/lib/nodejs --strip-components=1 -xJf /tmp/node.tar.xz
  rm -f /tmp/node.tar.xz
  ln -sfn /usr/local/lib/nodejs/bin/node /usr/local/bin/node
  ln -sfn /usr/local/lib/nodejs/bin/npm /usr/local/bin/npm
  ln -sfn /usr/local/lib/nodejs/bin/npx /usr/local/bin/npx
  hash -r
  node -v
  npm -v
fi

if ! command -v caddy >/dev/null 2>&1; then
  echo "نصب Caddy ${CADDY_VERSION}..."
  fetch_checked /tmp/caddy.deb sha512 "${CADDY_SHA512[$CADDYARCH]}" \
    "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_${CADDYARCH}.deb" \
    || { echo "دانلود Caddy شکست خورد."; exit 1; }
  apt-get install -y /tmp/caddy.deb
  rm -f /tmp/caddy.deb
fi

mkdir -p "$DEST"
if [ "$SRC" != "$DEST" ]; then
  tar -C "$SRC" \
    --exclude node_modules --exclude .next --exclude pb_data --exclude backend/bin \
    -cf - . | tar -C "$DEST" -xf -
fi

if [ ! -f "$DEST/backend/vendor/modules.txt" ]; then
  echo "backend/vendor در بسته نیست. زیپ را کامل باز کنید؛ go mod tidy لازم نیست و همان جا ۴۰۴ می‌سازد."
  exit 1
fi

if ! id negar >/dev/null 2>&1; then
  useradd --system --home "$DEST" --shell /usr/sbin/nologin negar
fi

install -d -o negar -g negar "$DEST/pb_data" "$DEST/backend/bin" "$DEST/.npm-cache"

umask 077
cat > "$DEST/backend/env" <<EOF
NEGAR_ADMIN_EMAIL="$(env_escape "$ADMIN_EMAIL")"
NEGAR_ADMIN_PASSWORD="$(env_escape "$ADMIN_PASSWORD")"
NEGAR_ADMIN_NAME="$(env_escape "مدیر")"
NEGAR_SITE_NAME="$(env_escape "$SITE_NAME")"
NEGAR_DOMAIN="$(env_escape "$DOMAIN")"
NEGAR_PUBLIC_URL="$(env_escape "https://${DOMAIN}")"
NEGAR_PLUGINS="$(env_escape "${DEST}/plugins")"
EOF
chmod 600 "$DEST/backend/env"

umask 022
cat > "$DEST/frontend/.env.production" <<EOF
PB_INTERNAL_URL=http://127.0.0.1:8090
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
EOF
# نام قدیمی؛ سرویس دیگر به آن وابسته نیست، فقط برای سازگاری با ارتقا می‌ماند.
cp "$DEST/frontend/.env.production" "$DEST/frontend/env"

echo "ساخت بک‌اند از vendor (بدون پروکسی ماژول)..."
export PATH="/usr/local/go/bin:/usr/local/bin:${PATH}"
cd "$DEST/backend"
CGO_ENABLED=0 go build -mod=vendor -trimpath -o "$DEST/backend/bin/negar" .

echo "ساخت فرانت..."
cd "$DEST/frontend"
if [ -n "${NPM_REGISTRY:-}" ]; then
  npm config set registry "$NPM_REGISTRY"
fi
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set audit false
npm config set fund false
npm config set update-notifier false
if [ -f package-lock.json ]; then
  npm ci --include=dev --no-audit --no-fund
else
  npm install --include=dev --no-audit --no-fund
fi
npm run build

chown -R negar:negar "$DEST"

NODE_BIN="$(command -v node)"
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
Environment=NODE_ENV=production
Environment=HOME=${DEST}
Environment=npm_config_cache=${DEST}/.npm-cache
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=${NODE_BIN} node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
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
systemctl enable caddy
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
