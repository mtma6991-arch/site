#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "با sudo اجرا کنید: sudo site $*"
  exit 1
fi

cmd="${1:-help}"
case "${cmd}" in
  rebuild)
    bash /opt/site/scripts/build-app.sh
    systemctl restart site-api
    systemctl restart site-web
    echo "بازسازی و راه‌اندازی دوباره انجام شد."
    ;;
  update)
    if [[ -d /opt/site/.git ]]; then
      git -C /opt/site pull --ff-only
      bash /usr/local/bin/site rebuild
    else
      echo "این کپی مخزن git نیست."
      echo "نسخهٔ تازه را جایگزین فایل‌های /opt/site کنید، پوشهٔ /var/lib/site را دست نزنید، بعد: sudo site rebuild"
      exit 1
    fi
    ;;
  restart)
    systemctl restart site-api site-web
    systemctl reload caddy || systemctl restart caddy
    ;;
  status)
    systemctl status site-api site-web caddy --no-pager || true
    ;;
  logs)
    journalctl -u site-api -u site-web -n 200 --no-pager
    ;;
  *)
    cat <<'EOF'
دستورهای سایت:
  sudo site rebuild   ساخت دوبارهٔ Go و Next و راه‌اندازی
  sudo site update    اگر با git clone نصب شده، دریافت نسخهٔ تازه
  sudo site restart   راه‌اندازی دوبارهٔ سرویس‌ها
  sudo site status    وضعیت سرویس‌ها
  sudo site logs      آخرین لاگ
EOF
    ;;
esac
