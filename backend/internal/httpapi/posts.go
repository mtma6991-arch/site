package httpapi

import (
	"net/http"
	"strconv"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func postDTO(r *core.Record, withContent bool) map[string]any {
	item := map[string]any{
		"id": r.Id, "title": r.GetString("title"), "slug": r.GetString("slug"),
		"excerpt": r.GetString("excerpt"), "status": r.GetString("status"),
		"coverUrl": r.GetString("cover_url"), "coverId": r.GetString("cover_id"),
		"tags":     stringList(r.Get("tags")),
		"seoTitle": r.GetString("seo_title"), "seoDescription": r.GetString("seo_description"),
		"publishedAt": iso(r.GetDateTime("published_at")),
		"createdAt":   iso(r.GetDateTime("created")),
		"updatedAt":   iso(r.GetDateTime("updated")),
	}
	if item["tags"] == nil {
		item["tags"] = []string{}
	}
	if withContent {
		item["content"] = r.GetString("content")
	}
	return item
}

func listPosts(e *core.RequestEvent) error {
	q := e.Request.URL.Query().Get("q")
	filter := ""
	var params map[string]any
	if q != "" {
		filter = "title ~ {:q} || slug ~ {:q}"
		params = map[string]any{"q": q}
	}
	recs, err := e.App.FindRecordsByFilter("posts", filter, "-updated", 200, 0, params)
	if err != nil {
		return e.BadRequestError("فهرست مقاله‌ها خوانده نشد.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, postDTO(r, false))
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func createPost(e *core.RequestEvent) error {
	var body struct {
		Title string `json:"title"`
		Slug  string `json:"slug"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	title := cleanText(body.Title, 180)
	if title == "" {
		title = "مقاله تازه"
	}
	base := body.Slug
	if base == "" {
		base = title
	}
	slug, err := uniqueSlug(e.App, "posts", base, "")
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}
	col, err := e.App.FindCollectionByNameOrId("posts")
	if err != nil {
		return e.InternalServerError("مجموعه مقاله‌ها نیست.", err)
	}
	rec := core.NewRecord(col)
	rec.Set("title", title)
	rec.Set("slug", slug)
	rec.Set("status", "draft")
	rec.Set("content", "")
	rec.Set("tags", []string{})
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ساخت مقاله ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, postDTO(rec, true))
}

func getPost(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "posts", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	return e.JSON(http.StatusOK, postDTO(rec, true))
}

func updatePost(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "posts", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	var body struct {
		Title          *string   `json:"title"`
		Slug           *string   `json:"slug"`
		Excerpt        *string   `json:"excerpt"`
		Content        *string   `json:"content"`
		CoverURL       *string   `json:"coverUrl"`
		CoverID        *string   `json:"coverId"`
		Tags           *[]string `json:"tags"`
		SEOTitle       *string   `json:"seoTitle"`
		SEODescription *string   `json:"seoDescription"`
	}
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
		slug, err := uniqueSlug(e.App, "posts", *body.Slug, rec.Id)
		if err != nil {
			return e.BadRequestError(err.Error(), nil)
		}
		rec.Set("slug", slug)
	}
	if body.Excerpt != nil {
		rec.Set("excerpt", cleanText(*body.Excerpt, 400))
	}
	if body.Content != nil {
		rec.Set("content", *body.Content)
	}
	if body.CoverURL != nil {
		rec.Set("cover_url", cleanText(*body.CoverURL, 500))
	}
	if body.CoverID != nil {
		rec.Set("cover_id", cleanText(*body.CoverID, 40))
	}
	if body.Tags != nil {
		tags := make([]string, 0, len(*body.Tags))
		for _, t := range *body.Tags {
			t = cleanText(t, 40)
			if t != "" {
				tags = append(tags, t)
			}
			if len(tags) >= 12 {
				break
			}
		}
		rec.Set("tags", tags)
	}
	if body.SEOTitle != nil {
		rec.Set("seo_title", cleanText(*body.SEOTitle, 180))
	}
	if body.SEODescription != nil {
		rec.Set("seo_description", cleanText(*body.SEODescription, 300))
	}
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ذخیره مقاله ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, postDTO(rec, true))
}

func deletePost(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "posts", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	if err := e.App.Delete(rec); err != nil {
		return e.BadRequestError("حذف ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}

func publishPost(e *core.RequestEvent) error   { return setPostStatus(e, "published") }
func unpublishPost(e *core.RequestEvent) error { return setPostStatus(e, "draft") }

func setPostStatus(e *core.RequestEvent, status string) error {
	rec, err := mustRecord(e, "posts", e.Request.PathValue("id"))
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
	return e.JSON(http.StatusOK, postDTO(rec, true))
}

func publicPosts(e *core.RequestEvent) error {
	per := 10
	if s, err := settingsRecord(e.App); err == nil {
		if n := int(s.GetFloat("posts_per_page")); n >= 1 && n <= 50 {
			per = n
		}
	}
	page := 1
	if p, err := strconv.Atoi(e.Request.URL.Query().Get("page")); err == nil && p > 0 {
		page = p
	}
	total, err := e.App.CountRecords("posts", dbx.HashExp{"status": "published"})
	if err != nil {
		return e.InternalServerError("خواندن مقاله‌ها ناموفق بود.", err)
	}
	recs, err := e.App.FindRecordsByFilter("posts", "status = 'published'", "-published_at", per, (page-1)*per)
	if err != nil {
		return e.BadRequestError("خواندن مقاله‌ها ناموفق بود.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, postDTO(r, false))
	}
	return e.JSON(http.StatusOK, map[string]any{
		"items": items, "page": page, "perPage": per, "total": total,
	})
}

func publicPost(e *core.RequestEvent) error {
	rec, err := publishedBySlug(e.App, "posts", e.Request.PathValue("slug"))
	if err != nil || rec == nil {
		return e.NotFoundError("مقاله پیدا نشد.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{
		"post": postDTO(rec, true), "snippets": snippetsFor(e.App, rec.GetString("slug")),
	})
}
