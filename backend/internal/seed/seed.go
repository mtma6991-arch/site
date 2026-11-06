package seed

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

func Ensure(app core.App) error {
	if err := ensureMeta(app); err != nil {
		return err
	}
	if err := ensureAdmin(app); err != nil {
		return err
	}
	if err := ensureContent(app); err != nil {
		return err
	}
	return nil
}

func env(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func ensureMeta(app core.App) error {
	publicURL := strings.TrimRight(env("NEGAR_PUBLIC_URL", ""), "/")
	siteName := env("NEGAR_SITE_NAME", "نگار")
	email := env("NEGAR_ADMIN_EMAIL", "")
	if publicURL == "" && email == "" {
		return nil
	}
	s := app.Settings()
	changed := false
	if siteName != "" && (s.Meta.AppName == "" || s.Meta.AppName == "PocketBase" || os.Getenv("NEGAR_SITE_NAME") != "") {
		if os.Getenv("NEGAR_SITE_NAME") != "" || s.Meta.AppName == "" || s.Meta.AppName == "PocketBase" {
			s.Meta.AppName = siteName
			s.Meta.SenderName = siteName
			changed = true
		}
	}
	if publicURL != "" && (s.Meta.AppURL == "" || s.Meta.AppURL == "http://localhost:8090" || os.Getenv("NEGAR_PUBLIC_URL") != "") {
		s.Meta.AppURL = publicURL
		changed = true
	}
	if email != "" && (s.Meta.SenderAddress == "" || strings.Contains(s.Meta.SenderAddress, "example.com")) {
		s.Meta.SenderAddress = email
		changed = true
	}
	if !changed {
		return nil
	}
	if err := app.Save(s); err != nil {
		return fmt.Errorf("settings meta: %w", err)
	}
	return nil
}

func ensureAdmin(app core.App) error {
	email := strings.TrimSpace(os.Getenv("NEGAR_ADMIN_EMAIL"))
	password := os.Getenv("NEGAR_ADMIN_PASSWORD")
	if email == "" || password == "" {
		return nil
	}
	if len(password) < 8 {
		return fmt.Errorf("NEGAR_ADMIN_PASSWORD must be at least 8 characters")
	}
	name := env("NEGAR_ADMIN_NAME", "مدیر")

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	if _, err := app.FindFirstRecordByFilter("users", "email = {:email}", dbx.Params{"email": email}); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		rec := core.NewRecord(users)
		rec.SetEmail(email)
		rec.SetPassword(password)
		rec.SetVerified(true)
		rec.Set("name", name)
		rec.Set("role", "admin")
		if err := app.Save(rec); err != nil {
			return fmt.Errorf("admin user: %w", err)
		}
		app.Logger().Info("created site admin", "email", email)
	}

	supers, err := app.FindCollectionByNameOrId(core.CollectionNameSuperusers)
	if err != nil {
		return err
	}
	if _, err := app.FindAuthRecordByEmail(core.CollectionNameSuperusers, email); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		rec := core.NewRecord(supers)
		rec.SetEmail(email)
		rec.SetPassword(password)
		if err := app.Save(rec); err != nil {
			return fmt.Errorf("superuser: %w", err)
		}
		app.Logger().Info("created pocketbase superuser", "email", email)
	}
	return nil
}

func ensureContent(app core.App) error {
	siteName := env("NEGAR_SITE_NAME", "نگار")
	if err := ensureSettingsRecord(app, siteName); err != nil {
		return err
	}
	if err := ensureCategory(app); err != nil {
		return err
	}
	if err := ensureHome(app, siteName); err != nil {
		return err
	}
	if err := ensureAbout(app, siteName); err != nil {
		return err
	}
	if err := ensurePosts(app, siteName); err != nil {
		return err
	}
	return nil
}

func ensureSettingsRecord(app core.App, siteName string) error {
	_, err := app.FindFirstRecordByFilter("settings", "key = 'site'")
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	col, err := app.FindCollectionByNameOrId("settings")
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("key", "site")
	rec.Set("site_name", siteName)
	rec.Set("tagline", "سایت‌ساز کامل؛ صفحه، مقاله، رسانه و پلاگین")
	rec.Set("description", siteName+" یک سایت‌ساز خودمیزبان است: صفحه‌ساز درگ‌انددراپ، مجله، مرکز رسانه و پلاگین‌هایی شبیه وردپرس.")
	rec.Set("footer", "ساخته‌شده با نگار. همهٔ محتوا از پنل مدیریت قابل ویرایش است.")
	rec.Set("menu", []map[string]string{
		{"label": "خانه", "href": "/"},
		{"label": "وبلاگ", "href": "/blog"},
		{"label": "درباره", "href": "/about"},
		{"label": "راهنمای پلاگین", "href": "/developers"},
	})
	rec.Set("posts_per_page", 9)
	rec.Set("seo_title", siteName)
	rec.Set("seo_description", "ساخت و انتشار صفحه، مقاله و پلاگین بدون دردسر.")
	return app.Save(rec)
}

func ensureCategory(app core.App) error {
	_, err := app.FindFirstRecordByFilter("categories", "slug = 'guides'")
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	col, err := app.FindCollectionByNameOrId("categories")
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("name", "راهنما")
	rec.Set("slug", "guides")
	return app.Save(rec)
}

func ensureHome(app core.App, siteName string) error {
	_, err := app.FindFirstRecordByFilter("pages", "slug = 'home'")
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	col, err := app.FindCollectionByNameOrId("pages")
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("title", "خانه")
	rec.Set("slug", "home")
	rec.Set("status", "published")
	rec.Set("seo_title", siteName+" — سایت‌ساز")
	rec.Set("seo_description", "صفحه بسازید، مقاله منتشر کنید و با پلاگین سایت را گسترش دهید.")
	rec.Set("published_at", time.Now().UTC().Format(time.RFC3339))
	rec.Set("document", homeDoc(siteName))
	return app.Save(rec)
}

func ensureAbout(app core.App, siteName string) error {
	_, err := app.FindFirstRecordByFilter("pages", "slug = 'about'")
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	col, err := app.FindCollectionByNameOrId("pages")
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("title", "درباره")
	rec.Set("slug", "about")
	rec.Set("status", "published")
	rec.Set("seo_title", "درباره "+siteName)
	rec.Set("seo_description", "این سایت با نگار ساخته شده و از مسیر /master مدیریت می‌شود.")
	rec.Set("published_at", time.Now().UTC().Format(time.RFC3339))
	rec.Set("document", map[string]any{
		"version": 1,
		"rows": []any{
			row("about-1", "#f4efe6", "lg", false,
				[]any{block("about-h", "heading", map[string]any{"text": "درباره این سایت", "level": "h1", "align": "start"})},
				[]any{block("about-t", "text", map[string]any{"html": "<p>" + siteName + " یک سایت‌ساز خودمیزبان است. صفحه‌ها را با کشیدن قطعه‌ها می‌چینید، مقاله‌ها را با ویرایشگر می‌نویسید، فایل‌ها را در مرکز رسانه نگه می‌دارید و با پلاگین امکان تازه اضافه می‌کنید.</p><p>پنل مدیریت روی مسیر <strong>/master</strong> است. این صفحه را از همان‌جا عوض کنید.</p>"})},
			),
		},
	})
	return app.Save(rec)
}

func ensurePosts(app core.App, siteName string) error {
	n, err := app.CountRecords("posts")
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	col, err := app.FindCollectionByNameOrId("posts")
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	posts := []struct {
		title, slug, excerpt, html string
	}{
		{
			title:   "چطور با صفحه‌ساز یک صفحه بسازیم",
			slug:    "page-builder-tour",
			excerpt: "از ایجاد پیش‌نویس تا چیدن قطعه‌ها و انتشار؛ یک دور کامل در پنل نگار.",
			html: `<p>صفحه‌ساز نگار برای کسی است که می‌خواهد چیدمان را ببیند، نه اینکه با کد بجنگد. از پنل مدیریت وارد «صفحه‌ها» شوید و یک صفحه تازه بسازید.</p>
<h2>سه ستون کار</h2>
<ul>
<li>سمت راست، کتابخانهٔ قطعه‌هاست. بخش، ستون، هیرو، کارت، تعرفه، پرسش و پاسخ، فرم و مقاله از همین‌جا می‌آیند.</li>
<li>بوم وسط، همان صفحه‌ای است که مخاطب می‌بیند. قطعه‌ها را بکشید یا با دکمهٔ افزودن وارد ستون کنید.</li>
<li>سمت چپ، ویژگی‌های قطعهٔ انتخاب‌شده است: متن، رنگ، پیوند، تصویر از مرکز رسانه.</li>
</ul>
<blockquote>تا وقتی وضعیت روی «پیش‌نویس» است، صفحه در سایت دیده نمی‌شود. انتشار همان لحظه آن را روی آدرسک عمومی می‌گذارد.</blockquote>
<p>صفحهٔ خانه با نامک <code>home</code> روی آدرس اصلی سایت نشان داده می‌شود. بقیهٔ صفحه‌ها روی <code>/نامک</code> هستند.</p>`,
		},
		{
			title:   "پلاگین‌ها و کد سفارشی",
			slug:    "plugins-and-snippets",
			excerpt: "امکان تازه را مثل وردپرس با یک پوشه اضافه کنید، یا کد را در سر، بدنه و پاورقی تزریق کنید.",
			html: `<p>` + siteName + ` پلاگین را از روی یک پوشه با فایل <code>plugin.json</code> می‌شناسد. نمونهٔ آماده، <strong>کد سفارشی</strong> است؛ همان ایدهٔ WPCode در وردپرس.</p>
<h2>کد سفارشی به چه کار می‌آید؟</h2>
<p>قطعهٔ HTML، CSS، JavaScript یا JSON-LD را می‌نویسید، جای درج را انتخاب می‌کنید (سر صفحه، ابتدای بدنه، انتهای بدنه، پاورقی) و اگر خواستید فقط روی چند نامک خاص فعالش می‌کنید. غیرفعال کردن پلاگین، تزریق همهٔ قطعه‌ها را قطع می‌کند.</p>
<h2>پلاگین خودتان</h2>
<p>راهنمای کامل در مسیر <a href="/developers">/developers</a> است. یک پلاگین می‌تواند قطعهٔ تازه به صفحه‌ساز اضافه کند، فایل CSS بدهد و فرم تنظیمات در پنل داشته باشد. نمونهٔ «نشان» را در کتابخانهٔ قطعه‌ها، گروه افزونه، ببینید.</p>`,
		},
	}
	for i, p := range posts {
		rec := core.NewRecord(col)
		rec.Set("title", p.title)
		rec.Set("slug", p.slug)
		rec.Set("excerpt", p.excerpt)
		rec.Set("content", p.html)
		rec.Set("status", "published")
		rec.Set("category", "راهنما")
		rec.Set("tags", "نگار, راهنما")
		rec.Set("author_name", "تحریریه")
		rec.Set("published_at", now.Add(-time.Duration(i)*time.Hour).Format(time.RFC3339))
		if err := app.Save(rec); err != nil {
			return err
		}
	}
	return nil
}

func homeDoc(siteName string) map[string]any {
	return map[string]any{
		"version": 1,
		"rows": []any{
			row("hero", "#1c1915", "lg", true,
				[]any{
					block("hero-1", "hero", map[string]any{
						"eyebrow":    "خودمیزبان",
						"title":      siteName,
						"subtitle":   "صفحه را بکشید و رها کنید، مقاله را با ابزار تحریر بنویسید، رسانه را یک‌جا نگه دارید و با پلاگین سایت را بزرگ کنید.",
						"buttonText": "ورود به مدیریت",
						"buttonHref": "/master",
						"secondText": "خواندن مجله",
						"secondHref": "/blog",
						"tone":       "ink",
					}),
				},
			),
			row("features", "#f7f3ec", "lg", false,
				[]any{
					block("fh", "heading", map[string]any{"text": "هرچه برای یک سایت جدی لازم است", "level": "h2", "align": "center"}),
					block("ft", "text", map[string]any{"html": "<p style=\"text-align:center\">این‌ها قطعهٔ تزئینی نیستند؛ هر کدام از پنل مدیریت ساخته و منتشر می‌شود.</p>"}),
					block("fg", "features", map[string]any{
						"items": []any{
							map[string]any{"title": "صفحه‌ساز", "text": "بخش، ستون، هیرو، کارت، تعرفه، فرم، گالری و HTML. چیدمان را ببینید و همان را منتشر کنید."},
							map[string]any{"title": "تحریریه", "text": "مقاله با عنوان، چکیده، تصویر، دسته و ویرایشگر کامل: تیتر، فهرست، نقل‌قول، کد، پیوند و تصویر."},
							map[string]any{"title": "مرکز رسانه", "text": "تصویر، ویدیو و PDF را بارگذاری کنید، نشانی را بردارید و داخل صفحه یا مقاله بگذارید."},
							map[string]any{"title": "پلاگین", "text": "پوشه را اضافه کنید یا فایل زیپ را از پنل نصب کنید. کد سفارشی، مثل WPCode، از روز اول همراه سایت است."},
						},
					}),
				},
			),
			row("stats", "#1f4d45", "md", false,
				[]any{
					block("st", "stats", map[string]any{
						"items": []any{
							map[string]any{"value": "۳۰+", "label": "نوع قطعه در صفحه‌ساز"},
							map[string]any{"value": "۴", "label": "جای درج کد سفارشی"},
							map[string]any{"value": "۱", "label": "دستور برای نصب روی سرور"},
							map[string]any{"value": "/master", "label": "مسیر پنل مدیریت"},
						},
					}),
				},
			),
			row("split", "#fffdf8", "lg", false,
				[]any{
					block("q", "quote", map[string]any{
						"text": "صفحهٔ خانه همین حالا یک سند صفحه‌ساز است. از مدیریت بازش کنید و این نقل‌قول را عوض کنید.",
						"cite": "برای کسی که سایت را تحویل می‌گیرد",
					}),
				},
				[]any{
					block("faq", "faq", map[string]any{
						"title": "پرسش‌های کوتاه",
						"items": []any{
							map[string]any{"q": "صفحه را کجا منتشر کنم؟", "a": "در ویرایشگر صفحه وضعیت را روی «منتشرشده» بگذارید و ذخیره کنید. نامک home صفحهٔ اصلی است."},
							map[string]any{"q": "کد آنالیتیکس را کجا بگذارم؟", "a": "پلاگین کد سفارشی در مدیریت. یک قطعهٔ JavaScript بسازید و جای آن را «سر صفحه» انتخاب کنید."},
							map[string]any{"q": "پلاگین را چطور اضافه کنم؟", "a": "زیپ پلاگین را از صفحهٔ پلاگین‌ها نصب کنید، یا پوشه‌اش را در plugins بگذارید و سرویس را ری‌استارت کنید. راهنما در /developers است."},
						},
					}),
				},
			),
			row("cta", "#b85c38", "md", true,
				[]any{
					block("cta1", "cta", map[string]any{
						"title":      "آمادهٔ عوض کردن این صفحه هستید؟",
						"text":       "وارد پنل شوید. نام کاربری و رمز را هنگام نصب خودتان تعیین کرده‌اید.",
						"buttonText": "رفتن به /master",
						"buttonHref": "/master",
						"tone":       "solid",
					}),
				},
			),
		},
	}
}

func row(id, bg, pad string, full bool, cols ...[]any) map[string]any {
	columns := make([]any, 0, len(cols))
	for i, blocks := range cols {
		columns = append(columns, map[string]any{
			"id":     fmt.Sprintf("%s-c%d", id, i+1),
			"blocks": blocks,
		})
	}
	return map[string]any{
		"id": id,
		"props": map[string]any{
			"bg":   bg,
			"pad":  pad,
			"full": full,
		},
		"columns": columns,
	}
}

func block(id, typ string, props map[string]any) map[string]any {
	return map[string]any{"id": id, "type": typ, "props": props}
}
