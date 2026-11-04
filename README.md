# نگار

سایت‌ساز خودمیزبان برای مخزن [mtma6991-arch/site](https://github.com/mtma6991-arch/site).

- بک‌اند: Go، با [PocketBase](https://pocketbase.io) به‌عنوان پایگاه و فایل
- فرانت: Next.js
- مدیریت: مسیر `/master`
- صفحه‌ساز درگ‌انددراپ، مجله، مرکز رسانه، پلاگین
- پلاگین **کد سفارشی** (ایدهٔ WPCode) از اول داخل مخزن است

## فرستادن به گیت‌هاب

محتوای همین پوشه را در ریشهٔ مخزن بگذارید، نه یک پوشهٔ اضافه.

```bash
cd site
git init
git add .
git commit -m "نگار"
git branch -M main
git remote add origin git@github.com:mtma6991-arch/site.git
git push -u origin main
```

## نصب روی سرور

سرور اوبونتو یا دبیان، با دسترسی ریشه و دامنهٔ اشاره‌شده به IP سرور.

```bash
git clone https://github.com/mtma6991-arch/site.git
cd site
sudo bash install.sh
```

اسکریپت دامنه، نام سایت، ایمیل و رمز مدیر را می‌پرسد. بعد Go، Node، Caddy و سرویس‌ها را نصب می‌کند و گواهی HTTPS را Caddy می‌گیرد.

بدون پرسش (مثلاً در اسکریپت خودتان):

```bash
sudo DOMAIN=example.com SITE_NAME=نگار ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='یک-رمز-بلند' bash install.sh
```

بعد از اتمام:

| | |
| --- | --- |
| سایت | `https://دامنه` |
| مدیریت | `https://دامنه/master` |
| پایگاه PocketBase | `https://دامنه/pb/_/` |

ایمیل و رمز هر دو ورود یکی است. رمز را اسکریپت در `/opt/site/backend/env` نگه می‌دارد؛ دسترسی فایل فقط برای ریشه است.

به‌روزرسانی از همان مخزن:

```bash
cd /opt/site && sudo git pull && sudo bash install.sh --upgrade
```

## توسعه روی سیستم خودتان

Go 1.26 و Node 22 لازم است.

```bash
bash dev.sh
```

سایت روی `http://127.0.0.1:3000` و مدیریت روی `/master`. ورود اولیه: `admin@example.com` / `admin12345`. این رمز فقط برای حالت توسعه است.

## چه چیزی داخل پنل است

- صفحه‌ها: ساخت، چیدن با کشیدن قطعه، پیش‌نویس و انتشار. نامک `home` صفحهٔ اصلی است.
- مقاله‌ها: ویرایشگر با تیتر، فهرست، نقل‌قول، کد، پیوند و تصویر از رسانه.
- رسانه: بارگذاری، توضیح، کپی نشانی.
- صندوق: پیام فرم تماس.
- پلاگین‌ها: روشن و خاموش، نصب زیپ، حذف.
- کد سفارشی: HTML و CSS و JavaScript و JSON-LD در سر، بدنه و پاورقی.
- کاربران: مدیر، ویرایشگر، نویسنده.
- تنظیمات: نام، منو، سئو، لوگو.

راهنمای ساخت پلاگین: [docs/plugin-development.md](docs/plugin-development.md) و بعد از نصب روی `/developers`.

## ساختار

```
backend/     برنامهٔ Go
frontend/    Next.js
plugins/     wpcode و example-badge
docs/        راهنمای توسعه‌دهنده
install.sh   نصب سرور
dev.sh       اجرای محلی
```
