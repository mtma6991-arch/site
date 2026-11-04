# نگار

سامانهٔ مدیریت محتوا: بک‌اند Go، پایگاه PocketBase، فرانت Next.js.

صفحه‌ساز کشیدنی، مقاله، مرکز رسانه، فرم، کاربر، و افزونه. افزونهٔ **کد سفارشی** مثل WPCode وردپرس همراه بسته است. راهنمای ساخت افزونه: [docs/plugin-development.md](docs/plugin-development.md) و داخل پنل در مسیر `/master/guide`.

مخزن: `https://github.com/mtma6991-arch/site`

## نصب روی سرور

یک سرور تازهٔ اوبونتو ۲۲.۰۴ یا ۲۴.۰۴ (حداقل ۲ گیگابایت رم) و یک دامنه که به IP سرور اشاره کند.

اسکریپت خودش Go، Node.js 22 و Caddy را دانلود و نصب می‌کند. دامنه، نام سایت، ایمیل و رمز مدیر را همان موقع می‌پرسد.

```bash
git clone https://github.com/mtma6991-arch/site.git
cd site
sudo bash install.sh
```

اگر کد را به‌صورت زیپ روی سرور ریخته‌اید، داخل همان پوشه `sudo bash install.sh` کافی است.

نصب بی‌پرسش:

```bash
sudo DOMAIN=example.com SITE_TITLE='نگار' ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='یک-رمز-بلند' WITH_WWW=1 bash install.sh --yes
```

بعد از نصب:

- سایت: `https://دامنه`
- پنل: `https://دامنه/master`

داده در `/var/lib/site` می‌ماند و با به‌روزرسانی کد پاک نمی‌شود.

```bash
sudo site status
sudo site logs
sudo site rebuild
sudo site update    # فقط اگر با git clone نصب شده باشد
```

اگر IP وارد کنید، سایت روی HTTP و بدون گواهی بالا می‌آید.

## توسعه روی رایانهٔ خودتان

Go 1.27 یا جدیدتر و Node 22.

```bash
bash scripts/dev.sh
```

ترمینال دوم:

```bash
cd frontend
npm install
npm run dev
```

ورود آزمایشی در خروجی `dev.sh` چاپ می‌شود. پنل: `http://127.0.0.1:3000/master`

## داخل پنل

- صفحات: ساخت، چیدن با کشیدن المان، انتشار
- مقاله‌ها: ویرایشگر با تیتر، فهرست، پیوند، تصویر از رسانه، حالت HTML
- رسانه: بارگذاری و گذاشتن در صفحه
- افزونه‌ها: روشن و خاموش، نصب زیپ
- کد سفارشی: اسنیپت HTML و CSS و JavaScript و شورت‌کد `[[snippet:شناسه]]`
- تنظیمات، کاربران، صندوق فرم‌ها

داشبورد PocketBase از اینترنت در دسترس نیست. روی خود سرور: `http://127.0.0.1:8090/_/` با همان ایمیل مدیر.
