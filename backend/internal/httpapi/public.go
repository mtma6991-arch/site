package httpapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/mtma6991-arch/site/backend/internal/pluginbox"
	"github.com/pocketbase/pocketbase/core"
)

func publicSite(e *core.RequestEvent) error {
	rec, _ := settingsRecord(e.App)
	els, _ := pluginbox.Elements(e.App, true)
	return e.JSON(http.StatusOK, map[string]any{
		"site":     settingsDTO(rec),
		"snippets": snippetsFor(e.App, ""),
		"elements": els,
	})
}

func publicPage(e *core.RequestEvent) error {
	slug := e.Request.PathValue("slug")
	rec, err := publishedBySlug(e.App, "pages", slug)
	if err != nil || rec == nil {
		return e.NotFoundError("صفحه پیدا نشد.", err)
	}
	site, _ := settingsRecord(e.App)
	els, _ := pluginbox.Elements(e.App, true)
	return e.JSON(http.StatusOK, map[string]any{
		"page":     pageDTO(rec),
		"site":     settingsDTO(site),
		"snippets": snippetsFor(e.App, slug),
		"elements": els,
	})
}

func publicElements(e *core.RequestEvent) error {
	els, err := pluginbox.Elements(e.App, true)
	if err != nil {
		return e.InternalServerError("المان‌ها خوانده نشد.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"items": els})
}

func publicForm(e *core.RequestEvent) error {
	if !formHits.allow(clientIP(e), 20, time.Hour) {
		return e.TooManyRequestsError("ارسال فرم موقتاً محدود شده.", nil)
	}
	var body struct {
		Form     string            `json:"form"`
		PageSlug string            `json:"pageSlug"`
		Data     map[string]string `json:"data"`
		Company  string            `json:"company"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	if strings.TrimSpace(body.Company) != "" {
		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}
	name := cleanText(body.Form, 80)
	if name == "" {
		name = "contact"
	}
	clean := map[string]string{}
	for k, v := range body.Data {
		k = cleanText(k, 40)
		v = cleanText(v, 4000)
		if k == "" || k == "company" {
			continue
		}
		clean[k] = v
		if len(clean) >= 30 {
			break
		}
	}
	if len(clean) == 0 {
		return e.BadRequestError("فرم خالی است.", nil)
	}
	col, err := e.App.FindCollectionByNameOrId("form_submissions")
	if err != nil {
		return e.InternalServerError("صندوق فرم نیست.", err)
	}
	rec := core.NewRecord(col)
	rec.Set("form_name", name)
	rec.Set("page_slug", cleanText(body.PageSlug, 80))
	rec.Set("data", clean)
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ثبت فرم ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}

func listForms(e *core.RequestEvent) error {
	recs, err := e.App.FindRecordsByFilter("form_submissions", "", "-created", 200, 0)
	if err != nil {
		return e.BadRequestError("فرم‌ها خوانده نشد.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, map[string]any{
			"id": r.Id, "form": r.GetString("form_name"),
			"pageSlug":  r.GetString("page_slug"),
			"data":      asAny(r.Get("data"), map[string]any{}),
			"createdAt": iso(r.GetDateTime("created")),
		})
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func deleteForm(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "form_submissions", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	if err := e.App.Delete(rec); err != nil {
		return e.BadRequestError("حذف ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}
