package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func pageDTO(r *core.Record) map[string]any {
	tree := asAny(r.Get("tree"), []any{})
	return map[string]any{
		"id": r.Id, "title": r.GetString("title"), "slug": r.GetString("slug"),
		"status": r.GetString("status"), "tree": tree,
		"seoTitle": r.GetString("seo_title"), "seoDescription": r.GetString("seo_description"),
		"publishedAt": iso(r.GetDateTime("published_at")),
		"createdAt":   iso(r.GetDateTime("created")),
		"updatedAt":   iso(r.GetDateTime("updated")),
	}
}

func listPages(e *core.RequestEvent) error {
	q := e.Request.URL.Query().Get("q")
	filter := ""
	var params map[string]any
	if q != "" {
		filter = "title ~ {:q} || slug ~ {:q}"
		params = map[string]any{"q": q}
	}
	recs, err := e.App.FindRecordsByFilter("pages", filter, "-updated", 200, 0, params)
	if err != nil {
		return e.BadRequestError("فهرست صفحات خوانده نشد.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, pageDTO(r))
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func createPage(e *core.RequestEvent) error {
	var body struct {
		Title string `json:"title"`
		Slug  string `json:"slug"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	title := cleanText(body.Title, 180)
	if title == "" {
		title = "صفحه تازه"
	}
	base := body.Slug
	if base == "" {
		base = title
	}
	slug, err := uniqueSlug(e.App, "pages", base, "")
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}
	col, err := e.App.FindCollectionByNameOrId("pages")
	if err != nil {
		return e.InternalServerError("مجموعه صفحات نیست.", err)
	}
	rec := core.NewRecord(col)
	rec.Set("title", title)
	rec.Set("slug", slug)
	rec.Set("status", "draft")
	rec.Set("tree", []any{})
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ساخت صفحه ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, pageDTO(rec))
}

type pageBody struct {
	Title          *string          `json:"title"`
	Slug           *string          `json:"slug"`
	Tree           *json.RawMessage `json:"tree"`
	SEOTitle       *string          `json:"seoTitle"`
	SEODescription *string          `json:"seoDescription"`
}

func updatePage(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "pages", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	var body pageBody
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	if body.Title != nil {
		title := cleanText(*body.Title, 180)
		if title == "" {
			return e.BadRequestError("عنوان خالی است.", nil)
		}
		rec.Set("title", title)
	}
	if body.Slug != nil {
		slug, err := uniqueSlug(e.App, "pages", *body.Slug, rec.Id)
		if err != nil {
			return e.BadRequestError(err.Error(), nil)
		}
		rec.Set("slug", slug)
	}
	if body.Tree != nil {
		if err := validateTree(*body.Tree); err != nil {
			return e.BadRequestError(err.Error(), nil)
		}
		var parsed any
		if err := json.Unmarshal(*body.Tree, &parsed); err != nil {
			return e.BadRequestError("ساختار صفحه نامعتبر است.", err)
		}
		rec.Set("tree", parsed)
	}
	if body.SEOTitle != nil {
		rec.Set("seo_title", cleanText(*body.SEOTitle, 180))
	}
	if body.SEODescription != nil {
		rec.Set("seo_description", cleanText(*body.SEODescription, 300))
	}
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ذخیره صفحه ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, pageDTO(rec))
}

func getPage(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "pages", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	return e.JSON(http.StatusOK, pageDTO(rec))
}

func deletePage(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "pages", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	if err := e.App.Delete(rec); err != nil {
		return e.BadRequestError("حذف ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}

func publishPage(e *core.RequestEvent) error   { return setPageStatus(e, "published") }
func unpublishPage(e *core.RequestEvent) error { return setPageStatus(e, "draft") }

func setPageStatus(e *core.RequestEvent, status string) error {
	rec, err := mustRecord(e, "pages", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	rec.Set("status", status)
	if status == "published" && rec.GetDateTime("published_at").IsZero() {
		rec.Set("published_at", types.NowDateTime())
	}
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("تغییر وضعیت ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, pageDTO(rec))
}

func duplicatePage(e *core.RequestEvent) error {
	src, err := mustRecord(e, "pages", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	slug, err := uniqueSlug(e.App, "pages", src.GetString("slug")+"-copy", "")
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}
	col := src.Collection()
	rec := core.NewRecord(col)
	rec.Set("title", src.GetString("title")+" (کپی)")
	rec.Set("slug", slug)
	rec.Set("status", "draft")
	rec.Set("tree", asAny(src.Get("tree"), []any{}))
	rec.Set("seo_title", src.GetString("seo_title"))
	rec.Set("seo_description", src.GetString("seo_description"))
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("کپی ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, pageDTO(rec))
}
