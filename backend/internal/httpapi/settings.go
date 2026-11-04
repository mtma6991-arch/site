package httpapi

import (
	"net/http"
	"os"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

type menuItem struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}

func settingsRecord(app core.App) (*core.Record, error) {
	return app.FindFirstRecordByFilter("site_settings", "id != ''")
}

func settingsDTO(r *core.Record) map[string]any {
	if r == nil {
		return map[string]any{
			"siteTitle": "نگار", "tagline": "", "footerText": "",
			"homepageSlug": "home", "logoUrl": "",
			"headerMenu": []any{}, "footerMenu": []any{},
			"postsPerPage": 10, "locale": "fa", "dir": "rtl",
			"domain": os.Getenv("DOMAIN"),
		}
	}
	per := int(r.GetFloat("posts_per_page"))
	if per < 1 || per > 50 {
		per = 10
	}
	domain := r.GetString("domain")
	if domain == "" {
		domain = os.Getenv("DOMAIN")
	}
	locale := r.GetString("locale")
	if locale == "" {
		locale = "fa"
	}
	dir := r.GetString("dir")
	if dir != "ltr" {
		dir = "rtl"
	}
	return map[string]any{
		"siteTitle":    r.GetString("site_title"),
		"tagline":      r.GetString("tagline"),
		"footerText":   r.GetString("footer_text"),
		"homepageSlug": r.GetString("homepage_slug"),
		"logoUrl":      fileURL("site_settings", r.Id, r.GetString("logo")),
		"headerMenu":   asAny(r.Get("header_menu"), []any{}),
		"footerMenu":   asAny(r.Get("footer_menu"), []any{}),
		"postsPerPage": per,
		"locale":       locale,
		"dir":          dir,
		"domain":       domain,
	}
}

func getSettings(e *core.RequestEvent) error {
	rec, err := settingsRecord(e.App)
	if err != nil {
		return e.InternalServerError("تنظیمات پیدا نشد.", err)
	}
	return e.JSON(http.StatusOK, settingsDTO(rec))
}

func cleanMenu(items []menuItem) []menuItem {
	out := make([]menuItem, 0, len(items))
	for _, it := range items {
		label := cleanText(it.Label, 60)
		href := cleanText(it.Href, 300)
		if label == "" || href == "" {
			continue
		}
		low := strings.ToLower(href)
		if strings.HasPrefix(low, "javascript:") || strings.HasPrefix(low, "data:") {
			continue
		}
		out = append(out, menuItem{Label: label, Href: href})
		if len(out) >= 24 {
			break
		}
	}
	return out
}

func putSettings(e *core.RequestEvent) error {
	rec, err := settingsRecord(e.App)
	if err != nil {
		return e.InternalServerError("تنظیمات پیدا نشد.", err)
	}
	var body struct {
		SiteTitle    *string    `json:"siteTitle"`
		Tagline      *string    `json:"tagline"`
		FooterText   *string    `json:"footerText"`
		HomepageSlug *string    `json:"homepageSlug"`
		HeaderMenu   []menuItem `json:"headerMenu"`
		FooterMenu   []menuItem `json:"footerMenu"`
		PostsPerPage *int       `json:"postsPerPage"`
		Locale       *string    `json:"locale"`
		Dir          *string    `json:"dir"`
		Domain       *string    `json:"domain"`
		RemoveLogo   bool       `json:"removeLogo"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	if body.SiteTitle != nil {
		rec.Set("site_title", cleanText(*body.SiteTitle, 160))
	}
	if body.Tagline != nil {
		rec.Set("tagline", cleanText(*body.Tagline, 240))
	}
	if body.FooterText != nil {
		rec.Set("footer_text", cleanText(*body.FooterText, 400))
	}
	if body.HomepageSlug != nil {
		rec.Set("homepage_slug", cleanText(*body.HomepageSlug, 80))
	}
	if body.HeaderMenu != nil {
		rec.Set("header_menu", cleanMenu(body.HeaderMenu))
	}
	if body.FooterMenu != nil {
		rec.Set("footer_menu", cleanMenu(body.FooterMenu))
	}
	if body.PostsPerPage != nil {
		n := *body.PostsPerPage
		if n < 1 {
			n = 1
		}
		if n > 50 {
			n = 50
		}
		rec.Set("posts_per_page", n)
	}
	if body.Locale != nil {
		loc := cleanText(*body.Locale, 12)
		if loc == "" {
			loc = "fa"
		}
		rec.Set("locale", loc)
	}
	if body.Dir != nil {
		if *body.Dir == "ltr" {
			rec.Set("dir", "ltr")
		} else {
			rec.Set("dir", "rtl")
		}
	}
	if body.Domain != nil {
		rec.Set("domain", cleanText(*body.Domain, 180))
	}
	if body.RemoveLogo {
		rec.Set("logo", "")
	}
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ذخیره تنظیمات ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, settingsDTO(rec))
}

func uploadLogo(e *core.RequestEvent) error {
	rec, err := settingsRecord(e.App)
	if err != nil {
		return e.InternalServerError("تنظیمات پیدا نشد.", err)
	}
	if err := e.Request.ParseMultipartForm(4 << 20); err != nil {
		return e.BadRequestError("فایل دریافت نشد.", err)
	}
	file, fh, err := e.Request.FormFile("file")
	if err != nil {
		return e.BadRequestError("فایل انتخاب نشده.", err)
	}
	defer file.Close()
	f, err := filesystem.NewFileFromMultipart(fh)
	if err != nil {
		return e.BadRequestError("خواندن فایل ناموفق بود.", err)
	}
	rec.Set("logo", f)
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ذخیره نشان ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, settingsDTO(rec))
}
