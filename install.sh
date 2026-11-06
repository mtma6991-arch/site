#!/usr/bin/env bash
# نصب کامل نگار روی اوبونتو یا دبیان.
# Go، Node، Caddy و سرویس‌ها را خودش می‌گیرد. دامنه را همین‌جا می‌پرسد.
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "با دسترسی ریشه اجرا کنید: sudo bash install.sh"
  exit 1
fi

YES=0
if [[ "${1:-}" == "--yes" ]]; then
  YES=1
fi

export DEBIAN_FRONTEND=noninteractive
SRC="$(cd "$(dirname "$0")" && pwd)"

log() { printf '\n== %s\n' "$*"; }
die() { printf 'خطا: %s\n' "$*" >&2; exit 1; }

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
else
  die "سیستم شناسایی نشد. این اسکریپت برای اوبونتو و دبیان است."
fi
case "${ID:-}" in
  ubuntu|debian) ;;
  *) die "فقط اوبونتو و دبیان پشتیبانی می‌شوند. شناسه سیستم: ${ID:-ناشناس}" ;;
esac

if [[ -f /etc/site/site.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/site/site.env
  set +a
fi

ask() {
  local var="$1" prompt="$2" def="${3:-}" secret="${4:-}"
  local cur="${!var:-}"
  if [[ "$YES" == 1 && -n "$cur" ]]; then
    return
  fi
  if [[ "$YES" == 1 && -n "$def" ]]; then
    printf -v "$var" '%s' "$def"
    return
  fi
  local input
  if [[ "$secret" == 1 ]]; then
    read -r -s -p "$prompt${def:+ [$def]}: " input || true
    echo
  else
    read -r -p "$prompt${def:+ [$def]}: " input || true
  fi
  if [[ -z "$input" ]]; then
    input="$def"
  fi
  if [[ -z "$input" && -n "$cur" ]]; then
    input="$cur"
  fi
  printf -v "$var" '%s' "$input"
}

echo "نصب نگار"
echo "اگر دامنه دارید و DNS آن به همین سرور اشاره می‌کند، نام دامنه را بنویسید."
echo "برای آزمایش فقط با IP، همان IP را بنویسید. در آن حالت گواهی HTTPS گرفته نمی‌شود."

ask DOMAIN "دامنه یا IP سایت" "${DOMAIN:-}"
[[ -n "${DOMAIN}" ]] || die "دامنه خالی است."
ask SITE_TITLE "نام سایت" "${SITE_TITLE:-نگار}"
ask ADMIN_EMAIL "ایمیل مدیر" "${ADMIN_EMAIL:-}"
[[ "$ADMIN_EMAIL" == *"@"* ]] || die "ایمیل معتبر نیست."

if [[ "$YES" != 1 || -z "${ADMIN_PASSWORD:-}" ]]; then
  while true; do
    ask ADMIN_PASSWORD "رمز مدیر (حداقل ۱۰ نویسه)" "" 1
    ask ADMIN_PASSWORD2 "تکرار رمز" "" 1
    if [[ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD2" ]]; then
      echo "رمزها یکی نیستند."
      continue
    fi
    if [[ "${#ADMIN_PASSWORD}" -lt 10 ]]; then
      echo "رمز کوتاه است."
      continue
    fi
    break
  done
fi

WWW="${WITH_WWW:-}"
if [[ "$YES" != 1 ]]; then
  read -r -p "نسخهٔ www هم به دامنه وصل شود؟ [y/N]: " WWWANS || true
  if [[ "${WWWANS:-}" == "y" || "${WWWANS:-}" == "Y" ]]; then
    WWW=1
  else
    WWW=0
  fi
fi

MODE=https
PUBLIC_URL="https://${DOMAIN}"
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ || "$DOMAIN" == *:* || "$DOMAIN" == "localhost" ]]; then
  MODE=http
  PUBLIC_URL="http://${DOMAIN}"
  echo "دامنه یک IP یا localhost است. سایت روی HTTP بالا می‌آید."
fi

arch_go() {
  case "$(uname -m)" in
    x86_64) echo amd64 ;;
    aarch64|arm64) echo arm64 ;;
    *) die "معماری $(uname -m) پشتیبانی نمی‌شود." ;;
  esac
}
arch_node() {
  case "$(uname -m)" in
    x86_64) echo x64 ;;
    aarch64|arm64) echo arm64 ;;
    *) die "معماری $(uname -m) پشتیبانی نمی‌شود." ;;
  esac
}

log "نصب ابزارهای پایه"
apt-get update
apt-get install -y ca-certificates curl tar xz-utils unzip rsync gnupg ufw

# گزینه‌های curl برای تمام دانلودها: تلاش دوباره خودکار و قطع نشدن روی کندی شبکه.
CURL_OPTS=(--fail --silent --show-error --location --retry 3 --retry-delay 2 --retry-connrefused --connect-timeout 10 --max-time 180)

# fetch_text <url> [url2] [url3] ...
# متن پاسخ اولین نشانی که کار کند را چاپ می‌کند. اگر همه ناموفق بودند، خطا می‌دهد.
fetch_text() {
  local url out
  for url in "$@"; do
    if out="$(curl "${CURL_OPTS[@]}" "$url" 2>/dev/null)"; then
      printf '%s' "$out"
      return 0
    fi
    echo "  منبع در دسترس نبود: $url" >&2
  done
  return 1
}

# fetch_to <پروندهٔ-خروجی> <url1> [url2] [url3] ...
# اولین نشانی که دانلودش موفق شود را در پروندهٔ خروجی می‌نویسد.
fetch_to() {
  local out="$1"; shift
  local url
  for url in "$@"; do
    echo "  تلاش برای دانلود از: $url" >&2
    if curl "${CURL_OPTS[@]}" "$url" -o "$out"; then
      return 0
    fi
    echo "  ناموفق بود، مسیر پشتیبان بعدی را امتحان می‌کنم…" >&2
  done
  return 1
}

install_go() {
  local need=1
  if command -v go >/dev/null 2>&1; then
    local v major minor
    v="$(go env GOVERSION 2>/dev/null || true)"
    major="$(printf '%s' "$v" | sed -E 's/^go([0-9]+).*/\1/')"
    minor="$(printf '%s' "$v" | sed -E 's/^go[0-9]+\.([0-9]+).*/\1/')"
    if [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]]; then
      if [[ "$major" -gt 1 || ( "$major" -eq 1 && "$minor" -ge 27 ) ]]; then
        need=0
      fi
    fi
  fi
  if [[ "$need" == 0 ]]; then
    echo "Go از قبل مناسب است: $(go version)"
    return
  fi
  log "دانلود Go"
  local arch json file
  arch="$(arch_go)"
  json="$(fetch_text \
    "https://go.dev/dl/?mode=json" \
    "https://golang.google.cn/dl/?mode=json")" \
    || die "فهرست نسخه‌های Go از هیچ‌کدام از منابع (go.dev، golang.google.cn) خوانده نشد. اتصال اینترنت سرور را بررسی کنید."
  file="$(printf '%s' "$json" | grep -oE "go1\\.(2[7-9]|[3-9][0-9])\\.[0-9]+\\.linux-${arch}\\.tar\\.gz" | head -1)"
  [[ -n "$file" ]] || die "نسخهٔ مناسب Go برای معماری ${arch} در فهرست پیدا نشد."
  fetch_to /tmp/go.tgz \
    "https://go.dev/dl/${file}" \
    "https://dl.google.com/go/${file}" \
    "https://golang.google.cn/dl/${file}" \
    || die "دانلود Go از همهٔ مسیرهای پشتیبان (go.dev، dl.google.com، golang.google.cn) ناموفق بود."
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tgz
  ln -sfn /usr/local/go/bin/go /usr/local/bin/go
  ln -sfn /usr/local/go/bin/gofmt /usr/local/bin/gofmt
  go version
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p "Number(process.versions.node.split('.')[0])")"
    if [[ "$major" -ge 22 ]]; then
      echo "Node از قبل مناسب است: $(node -v)"
      return
    fi
  fi
  log "دانلود Node.js 22"
  local arch shasums name
  arch="$(arch_node)"
  local node_mirrors=(
    "https://nodejs.org/dist/latest-v22.x"
    "https://cdn.npmmirror.com/binary/node/latest-v22.x"
    "https://mirrors.huaweicloud.com/nodejs/latest-v22.x"
  )
  local sha_urls=()
  for m in "${node_mirrors[@]}"; do sha_urls+=("${m}/SHASUMS256.txt"); done
  shasums="$(fetch_text "${sha_urls[@]}")" \
    || die "فهرست نسخه‌های Node از هیچ‌کدام از منابع خوانده نشد. اتصال اینترنت سرور را بررسی کنید."
  name="$(printf '%s' "$shasums" | awk "/linux-${arch}\\.tar\\.xz\$/{print \$2; exit}")"
  [[ -n "$name" ]] || die "فایل مناسب Node برای معماری ${arch} در فهرست پیدا نشد."
  local node_urls=()
  for m in "${node_mirrors[@]}"; do node_urls+=("${m}/${name}"); done
  fetch_to /tmp/node.tar.xz "${node_urls[@]}" \
    || die "دانلود Node از همهٔ مسیرهای پشتیبان ناموفق بود."
  tar -C /usr/local --strip-components=1 -xJf /tmp/node.tar.xz
  node -v
  npm -v
}

install_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    echo "Caddy از قبل نصب است: $(command -v caddy)"
    return
  fi
  log "دانلود Caddy"
  local arch
  arch="$(arch_go)"
  if fetch_to /usr/local/bin/caddy \
    "https://caddyserver.com/api/download?os=linux&arch=${arch}"; then
    chmod 755 /usr/local/bin/caddy
  else
    echo "  منبع اصلی Caddy در دسترس نبود؛ تلاش از طریق GitHub Releases…" >&2
    local gh_json asset_url
    gh_json="$(fetch_text \
      "https://api.github.com/repos/caddyserver/caddy/releases/latest" \
      "https://ghproxy.com/https://api.github.com/repos/caddyserver/caddy/releases/latest")" \
      || die "دانلود Caddy ناموفق بود: نه آدرس اصلی و نه GitHub در دسترس بودند."
    asset_url="$(printf '%s' "$gh_json" \
      | grep -oE "\"browser_download_url\" *: *\"[^\"]*linux_${arch}\\.tar\\.gz\"" \
      | head -1 | sed -E 's/.*"(https:[^"]+)".*/\1/')"
    [[ -n "$asset_url" ]] || die "فایل مناسب Caddy برای معماری ${arch} در GitHub پیدا نشد."
    fetch_to /tmp/caddy.tar.gz \
      "$asset_url" \
      "https://ghproxy.com/${asset_url}" \
      || die "دانلود Caddy از GitHub و مسیر پشتیبان آن ناموفق بود."
    tar -xzf /tmp/caddy.tar.gz -C /tmp caddy
    install -m 755 /tmp/caddy /usr/local/bin/caddy
    rm -f /tmp/caddy.tar.gz /tmp/caddy
  fi
  if [[ ! -f /lib/systemd/system/caddy.service && ! -f /etc/systemd/system/caddy.service ]]; then
    cat > /etc/systemd/system/caddy.service <<'UNIT'
[Unit]
Description=Caddy
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile
TimeoutStopSec=5s
LimitNOFILE=1048576
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT
  fi
}

install_go
install_node
install_caddy

log "کپی پرونده‌ها"
if ! id site >/dev/null 2>&1; then
  useradd --system --home /opt/site --shell /usr/sbin/nologin site || useradd --system --home /opt/site --shell /bin/false site
fi
mkdir -p /opt/site /var/lib/site/pb_data /etc/site
if [[ "$SRC" != "/opt/site" ]]; then
  rsync -a --delete \
    --exclude pb_data \
    --exclude node_modules \
    --exclude .next \
    --exclude bin \
    --exclude plugins \
    --exclude frontend/.env.production \
    "${SRC}/" /opt/site/
  mkdir -p /opt/site/plugins
  for d in "${SRC}/plugins"/*; do
    [[ -d "$d" ]] || continue
    name="$(basename "$d")"
    rm -rf "/opt/site/plugins/${name}"
    cp -a "$d" "/opt/site/plugins/${name}"
  done
fi

q() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
cat > /etc/site/site.env <<EOF
PB_DATA=/var/lib/site/pb_data
PLUGINS_DIR=/opt/site/plugins
ADMIN_EMAIL=$(q "$ADMIN_EMAIL")
ADMIN_PASSWORD=$(q "$ADMIN_PASSWORD")
SITE_TITLE=$(q "$SITE_TITLE")
DOMAIN=$(q "$DOMAIN")
PUBLIC_URL=$(q "$PUBLIC_URL")
INTERNAL_API_URL='http://127.0.0.1:8090'
EOF
chmod 640 /etc/site/site.env
chgrp site /etc/site/site.env

install -m 755 /opt/site/scripts/site-cli.sh /usr/local/bin/site

log "ساخت برنامه (ممکن است چند دقیقه طول بکشد)"
bash /opt/site/scripts/build-app.sh

chown -R site:site /opt/site /var/lib/site

NODE_BIN="$(command -v node)"
cat > /etc/systemd/system/site-api.service <<'EOF'
[Unit]
Description=نگار API و PocketBase
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=site
Group=site
EnvironmentFile=/etc/site/site.env
WorkingDirectory=/opt/site
ExecStart=/opt/site/bin/site-api serve --http=127.0.0.1:8090 --dir=/var/lib/site/pb_data
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/site-web.service <<EOF
[Unit]
Description=نگار وب
After=site-api.service
Wants=site-api.service

[Service]
Type=simple
User=site
Group=site
EnvironmentFile=/etc/site/site.env
WorkingDirectory=/opt/site/frontend/.next/standalone
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=${NODE_BIN} server.js
Restart=on-failure
RestartSec=2
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /etc/caddy
if [[ -f /etc/caddy/Caddyfile ]] && ! grep -q "NEGAR-CMS" /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%s)"
fi

if [[ "$MODE" == https ]]; then
  cat > /etc/caddy/Caddyfile <<EOF
# NEGAR-CMS
${DOMAIN} {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:8090
	}
	handle {
		reverse_proxy 127.0.0.1:3000
	}
	header {
		-Server
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
	}
}
EOF
  if [[ "$WWW" == 1 ]]; then
    cat >> /etc/caddy/Caddyfile <<EOF
www.${DOMAIN} {
	redir https://${DOMAIN}{uri} permanent
}
EOF
  fi
else
  cat > /etc/caddy/Caddyfile <<EOF
# NEGAR-CMS
:80 {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:8090
	}
	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
EOF
fi

log "راه‌اندازی سرویس‌ها"
systemctl daemon-reload
systemctl enable site-api site-web caddy
systemctl restart site-api
ok=0
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:8090/api/v1/health" >/dev/null; then
    ok=1
    break
  fi
  sleep 1
done
[[ "$ok" == 1 ]] || die "سرویس API بالا نیامد. لاگ: journalctl -u site-api -n 80"
systemctl restart site-web
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw --force enable || true
fi

echo
echo "نگار نصب شد."
echo "سایت: ${PUBLIC_URL}"
echo "پنل:  ${PUBLIC_URL}/master"
echo "ایمیل مدیر: ${ADMIN_EMAIL}"
echo "رمز همان است که همین حالا وارد کردید."
if [[ "$MODE" == https ]]; then
  echo "اگر گواهی ساخته نشد، رکورد DNS دامنه را به IP این سرور اشاره دهید و بعد: sudo systemctl restart caddy"
fi
echo "دستورهای بعدی: sudo site status | sudo site logs | sudo site rebuild"
