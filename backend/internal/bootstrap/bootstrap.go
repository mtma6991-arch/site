package bootstrap

import (
	"os"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

const Version = "1.0.0"

func Ensure(app core.App) error {
	if err := ensureUsers(app); err != nil {
		return err
	}
	if err := ensureCollection(app, "pages", pageFields(), "slug"); err != nil {
		return err
	}
	if err := ensureCollection(app, "posts", postFields(), "slug"); err != nil {
		return err
	}
	if err := ensureCollection(app, "media", mediaFields(), ""); err != nil {
		return err
	}
	if err := ensureCollection(app, "snippets", snippetFields(), "slug"); err != nil {
		return err
	}
	if err := ensureCollection(app, "plugin_states", pluginStateFields(), "slug"); err != nil {
		return err
	}
	if err := ensureCollection(app, "site_settings", settingsFields(), ""); err != nil {
		return err
	}
	if err := ensureCollection(app, "form_submissions", formFields(), ""); err != nil {
		return err
	}
	if err := ensureSettingsRow(app); err != nil {
		return err
	}
	if err := ensurePluginDefaults(app); err != nil {
		return err
	}
	if err := ensureAdmin(app); err != nil {
		return err
	}
	if err := ensureSuperuser(app); err != nil {
		return err
	}
	if err := seedContent(app); err != nil {
		return err
	}
	return tunePocketBase(app)
}

func ensureUsers(app core.App) error {
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		col = core.NewAuthCollection("users")
		col.Fields.Add(&core.TextField{Name: "name", Max: 120})
		col.Fields.Add(&core.SelectField{
			Name:      "role",
			Values:    []string{"admin", "editor"},
			MaxSelect: 1,
			Required:  true,
		})
		return app.Save(col)
	}
	changed := false
	if col.Fields.GetByName("name") == nil {
		col.Fields.Add(&core.TextField{Name: "name", Max: 120})
		changed = true
	}
	if col.Fields.GetByName("role") == nil {
		col.Fields.Add(&core.SelectField{
			Name:      "role",
			Values:    []string{"admin", "editor"},
			MaxSelect: 1,
			Required:  true,
		})
		changed = true
	}
	if changed {
		return app.Save(col)
	}
	return nil
}

func ensureCollection(app core.App, name string, fields []core.Field, unique string) error {
	col, err := app.FindCollectionByNameOrId(name)
	if err != nil {
		col = core.NewBaseCollection(name)
		for _, f := range fields {
			col.Fields.Add(f)
		}
		if unique != "" {
			col.AddIndex("idx_"+name+"_"+unique, true, unique, "")
		}
		return app.Save(col)
	}
	changed := false
	for _, f := range fields {
		if col.Fields.GetByName(f.GetName()) == nil {
			col.Fields.Add(f)
			changed = true
		}
	}
	if changed {
		return app.Save(col)
	}
	return nil
}

func pageFields() []core.Field {
	return []core.Field{
		&core.TextField{Name: "title", Required: true, Max: 180},
		&core.TextField{Name: "slug", Required: true, Max: 80},
		&core.SelectField{Name: "status", Required: true, Values: []string{"draft", "published"}, MaxSelect: 1},
		&core.JSONField{Name: "tree", MaxSize: 8 << 20},
		&core.TextField{Name: "seo_title", Max: 180},
		&core.TextField{Name: "seo_description", Max: 300},
		&core.DateField{Name: "published_at"},
		&core.AutodateField{Name: "created", OnCreate: true},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	}
}

func postFields() []core.Field {
	return []core.Field{
		&core.TextField{Name: "title", Required: true, Max: 180},
		&core.TextField{Name: "slug", Required: true, Max: 80},
		&core.TextField{Name: "excerpt", Max: 400},
		&core.TextField{Name: "content"},
		&core.SelectField{Name: "status", Required: true, Values: []string{"draft", "published"}, MaxSelect: 1},
		&core.TextField{Name: "cover_url", Max: 500},
		&core.TextField{Name: "cover_id", Max: 40},
		&core.JSONField{Name: "tags", MaxSize: 64 << 10},
		&core.TextField{Name: "seo_title", Max: 180},
		&core.TextField{Name: "seo_description", Max: 300},
		&core.DateField{Name: "published_at"},
		&core.AutodateField{Name: "created", OnCreate: true},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	}
}

func mediaFields() []core.Field {
	return []core.Field{
		&core.FileField{
			Name:      "file",
			MaxSelect: 1,
			MaxSize:   32 << 20,
			MimeTypes: []string{
				"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
				"video/mp4", "video/webm", "audio/mpeg", "application/pdf",
			},
		},
		&core.TextField{Name: "alt", Max: 240},
		&core.TextField{Name: "title", Max: 180},
		&core.TextField{Name: "mime", Max: 120},
		&core.NumberField{Name: "size"},
		&core.AutodateField{Name: "created", OnCreate: true},
	}
}

func snippetFields() []core.Field {
	return []core.Field{
		&core.TextField{Name: "title", Required: true, Max: 160},
		&core.TextField{Name: "slug", Required: true, Max: 80},
		&core.TextField{Name: "description", Max: 300},
		&core.TextField{Name: "code"},
		&core.SelectField{Name: "kind", Required: true, MaxSelect: 1, Values: []string{"html", "css", "js", "shortcode"}},
		&core.SelectField{Name: "location", Required: true, MaxSelect: 1, Values: []string{"header", "footer", "body_open", "shortcode"}},
		&core.BoolField{Name: "active"},
		&core.NumberField{Name: "priority"},
		&core.JSONField{Name: "pages", MaxSize: 64 << 10},
		&core.AutodateField{Name: "created", OnCreate: true},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	}
}

func pluginStateFields() []core.Field {
	return []core.Field{
		&core.TextField{Name: "slug", Required: true, Max: 60},
		&core.BoolField{Name: "enabled"},
		&core.JSONField{Name: "config", MaxSize: 1 << 20},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	}
}

func settingsFields() []core.Field {
	return []core.Field{
		&core.TextField{Name: "site_title", Max: 160},
		&core.TextField{Name: "tagline", Max: 240},
		&core.TextField{Name: "footer_text", Max: 400},
		&core.TextField{Name: "homepage_slug", Max: 80},
		&core.FileField{Name: "logo", MaxSelect: 1, MaxSize: 4 << 20, MimeTypes: []string{"image/jpeg", "image/png", "image/webp", "image/gif"}},
		&core.JSONField{Name: "header_menu", MaxSize: 64 << 10},
		&core.JSONField{Name: "footer_menu", MaxSize: 64 << 10},
		&core.NumberField{Name: "posts_per_page"},
		&core.TextField{Name: "locale", Max: 12},
		&core.TextField{Name: "dir", Max: 3},
		&core.TextField{Name: "domain", Max: 180},
	}
}

func formFields() []core.Field {
	return []core.Field{
		&core.TextField{Name: "form_name", Max: 80},
		&core.TextField{Name: "page_slug", Max: 80},
		&core.JSONField{Name: "data", MaxSize: 256 << 10},
		&core.AutodateField{Name: "created", OnCreate: true},
	}
}

func ensureSettingsRow(app core.App) error {
	_, err := app.FindFirstRecordByFilter("site_settings", "id != ''")
	if err == nil {
		return nil
	}
	col, err := app.FindCollectionByNameOrId("site_settings")
	if err != nil {
		return err
	}
	title := strings.TrimSpace(os.Getenv("SITE_TITLE"))
	if title == "" {
		title = "نگار"
	}
	rec := core.NewRecord(col)
	rec.Set("site_title", title)
	rec.Set("tagline", "سایت را مثل یک کارگاه بچینید")
	rec.Set("footer_text", "ساخته‌شده با نگار")
	rec.Set("homepage_slug", "home")
	rec.Set("header_menu", []map[string]string{
		{"label": "خانه", "href": "/"},
		{"label": "وبلاگ", "href": "/blog"},
	})
	rec.Set("footer_menu", []map[string]string{
		{"label": "وبلاگ", "href": "/blog"},
	})
	rec.Set("posts_per_page", 10)
	rec.Set("locale", "fa")
	rec.Set("dir", "rtl")
	rec.Set("domain", strings.TrimSpace(os.Getenv("DOMAIN")))
	return app.Save(rec)
}

func ensurePluginDefaults(app core.App) error {
	defaults := map[string]bool{"wpcode": true, "example-notice": false}
	col, err := app.FindCollectionByNameOrId("plugin_states")
	if err != nil {
		return err
	}
	for slug, enabled := range defaults {
		if _, err := app.FindFirstRecordByData("plugin_states", "slug", slug); err == nil {
			continue
		}
		rec := core.NewRecord(col)
		rec.Set("slug", slug)
		rec.Set("enabled", enabled)
		rec.Set("config", map[string]any{})
		if err := app.Save(rec); err != nil {
			return err
		}
	}
	return nil
}

func ensureAdmin(app core.App) error {
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		return nil
	}
	total, err := app.CountRecords("users")
	if err != nil {
		return err
	}
	if total > 0 {
		return nil
	}
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.SetEmail(email)
	rec.SetPassword(password)
	rec.Set("name", "مدیر")
	rec.Set("role", "admin")
	rec.Set("verified", true)
	return app.Save(rec)
}

func ensureSuperuser(app core.App) error {
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		return nil
	}
	if _, err := app.FindAuthRecordByEmail(core.CollectionNameSuperusers, email); err == nil {
		return nil
	}
	col, err := app.FindCollectionByNameOrId(core.CollectionNameSuperusers)
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.SetEmail(email)
	rec.SetPassword(password)
	return app.Save(rec)
}

func tunePocketBase(app core.App) error {
	s := app.Settings()
	changed := false
	if s.Meta.AppName == "" || s.Meta.AppName == "Acme" {
		title := strings.TrimSpace(os.Getenv("SITE_TITLE"))
		if title == "" {
			title = "نگار"
		}
		s.Meta.AppName = title
		changed = true
	}
	if len(s.TrustedProxy.Headers) == 0 {
		s.TrustedProxy.Headers = []string{"X-Forwarded-For", "X-Real-IP"}
		s.TrustedProxy.UseLeftmostIP = false
		changed = true
	}
	if !changed {
		return nil
	}
	return app.Save(s)
}

func seedContent(app core.App) error {
	n, err := app.CountRecords("pages")
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	pages, err := app.FindCollectionByNameOrId("pages")
	if err != nil {
		return err
	}
	home := core.NewRecord(pages)
	home.Set("title", "خانه")
	home.Set("slug", "home")
	home.Set("status", "published")
	home.Set("seo_title", "نگار")
	home.Set("seo_description", "سامانه مدیریت محتوا با صفحه‌ساز، مقاله، رسانه و افزونه")
	home.Set("tree", homeTree())
	home.Set("published_at", types.NowDateTime())
	if err := app.Save(home); err != nil {
		return err
	}

	about := core.NewRecord(pages)
	about.Set("title", "درباره")
	about.Set("slug", "about")
	about.Set("status", "draft")
	about.Set("seo_title", "درباره")
	about.Set("tree", []any{
		map[string]any{
			"id":   "about-hero",
			"type": "hero",
			"props": map[string]any{
				"eyebrow": "پیش‌نویس", "title": "درباره این سایت",
				"subtitle": "این صفحه هنوز منتشر نشده. از صفحه‌ساز آن را کامل کنید.",
				"align":    "center", "tone": "paper",
			},
		},
	})
	if err := app.Save(about); err != nil {
		return err
	}

	posts, err := app.FindCollectionByNameOrId("posts")
	if err != nil {
		return err
	}
	post := core.NewRecord(posts)
	post.Set("title", "چطور با صفحه‌ساز یک صفحه بسازیم")
	post.Set("slug", "page-builder")
	post.Set("excerpt", "از پنل مدیریت، صفحه تازه بسازید، المان بکشید و منتشر کنید.")
	post.Set("status", "published")
	post.Set("tags", []string{"راهنما", "صفحه‌ساز"})
	post.Set("seo_title", "آموزش صفحه‌ساز نگار")
	post.Set("published_at", types.NowDateTime())
	post.Set("content", `<h2>یک صفحه تازه</h2><p>وارد <strong>صفحات</strong> شوید و «صفحه جدید» را بزنید. از ستون المان‌ها یک بخش، یک تیتر یا یک قهرمان اضافه کنید.</p><h2>انتشار</h2><p>تا وقتی وضعیت پیش‌نویس است، فقط شما در پنل آن را می‌بینید. با دکمه انتشار، صفحه روی دامنه عمومی می‌آید.</p><blockquote><p>افزونه کد سفارشی مثل WPCode است: HTML و CSS و JavaScript را بدون دست‌زدن به هسته تزریق می‌کند.</p></blockquote>`)
	return app.Save(post)
}

func homeTree() []any {
	return []any{
		map[string]any{
			"id": "hero-1", "type": "hero",
			"props": map[string]any{
				"eyebrow": "نگار", "title": "سایت را مثل یک کارگاه بچینید",
				"subtitle":    "صفحه‌ساز کشیدنی، مقاله‌نویس، مرکز رسانه و افزونه. همین صفحه با همین ابزار ساخته شده و می‌توانید تکه‌تکه‌اش را عوض کنید.",
				"buttonLabel": "وبلاگ", "buttonHref": "/blog",
				"secondaryLabel": "درباره", "secondaryHref": "/about",
				"align": "start", "tone": "ink",
			},
		},
		map[string]any{
			"id": "feat-1", "type": "features",
			"props": map[string]any{
				"title": "آنچه از اول همراهتان است", "subtitle": "بدون نصب جداگانه، چهار ستون یک سایت واقعی.",
				"items": []any{
					map[string]any{"icon": "layout", "title": "صفحه‌ساز", "text": "بخش، ستون، قهرمان، قیمت، پرسش، فرم و ده‌ها المان دیگر را بکشید و منتشر کنید."},
					map[string]any{"icon": "pen", "title": "مقاله", "text": "ویرایشگر با تیتر، نقل‌قول، تصویر از رسانه، تراز و حالت کد."},
					map[string]any{"icon": "image", "title": "رسانه", "text": "تصویر، ویدیو و PDF در یک کتابخانه، آمادهٔ گذاشتن داخل صفحه."},
					map[string]any{"icon": "puzzle", "title": "افزونه", "text": "پوشه و فایل plugin.json، یا زیپ از داخل پنل. نمونهٔ آماده: کد سفارشی."},
				},
			},
		},
		map[string]any{
			"id": "stats-1", "type": "stats",
			"props": map[string]any{
				"items": []any{
					map[string]any{"value": "۳۰+", "label": "المان صفحه‌ساز"},
					map[string]any{"value": "۱", "label": "افزونه کد، مشابه WPCode"},
					map[string]any{"value": "Go", "label": "بک‌اند و PocketBase"},
					map[string]any{"value": "Next", "label": "ظاهر عمومی و پنل"},
				},
			},
		},
		map[string]any{
			"id": "quote-1", "type": "testimonials",
			"props": map[string]any{
				"title": "برای کسی که سایت را خودش اداره می‌کند",
				"items": []any{
					map[string]any{"quote": "صفحه را می‌چینم، مقاله را می‌نویسم و اگر چیزی کم بود با یک افزونه اضافه می‌کنم؛ نه با دست‌کاری هسته.", "name": "نمونه", "role": "مدیر سایت"},
				},
			},
		},
		map[string]any{
			"id": "faq-1", "type": "faq",
			"props": map[string]any{
				"title": "پرسش‌های کوتاه",
				"items": []any{
					map[string]any{"q": "پنل کجاست؟", "a": "مسیر /master روی همین دامنه. نام کاربری و رمز را هنگام نصب تعیین کرده‌اید."},
					map[string]any{"q": "داده کجا می‌ماند؟", "a": "PocketBase همه‌چیز را در SQLite داخل سرور نگه می‌دارد؛ فایل‌ها کنار همان داده‌اند."},
					map[string]any{"q": "افزونه را چطور اضافه کنم؟", "a": "راهنمای ساخت افزونه داخل پنل است. برای شروع، افزونه کد سفارشی را باز کنید."},
				},
			},
		},
		map[string]any{
			"id": "cta-1", "type": "cta",
			"props": map[string]any{
				"title": "این صفحه مال شماست", "text": "از پنل، خانه را عوض کنید یا یک صفحه تازه منتشر کنید.",
				"buttonLabel": "خواندن راهنمای صفحه‌ساز", "buttonHref": "/blog/page-builder", "tone": "teal",
			},
		},
	}
}
