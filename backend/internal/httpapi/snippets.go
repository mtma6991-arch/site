package httpapi

import (
	"net/http"
	"strings"

	"github.com/mtma6991-arch/site/backend/internal/pluginbox"
	"github.com/pocketbase/pocketbase/core"
)

func snippetsFor(app core.App, pageSlug string) map[string]any {
	empty := map[string]any{
		"header": []any{}, "footer": []any{}, "bodyOpen": []any{},
		"css": "", "jsHeader": "", "jsFooter": "",
		"shortcodes": map[string]string{},
	}
	if !pluginbox.Enabled(app, "wpcode") {
		return empty
	}
	recs, err := app.FindRecordsByFilter("snippets", "active = true", "priority", 300, 0)
	if err != nil {
		return empty
	}
	header := []any{}
	footer := []any{}
	bodyOpen := []any{}
	var css, jsHeader, jsFooter strings.Builder
	shorts := map[string]string{}
	for _, r := range recs {
		if !snippetMatches(r, pageSlug) {
			continue
		}
		kind := r.GetString("kind")
		loc := r.GetString("location")
		code := r.GetString("code")
		item := map[string]any{"id": r.Id, "kind": kind, "code": code, "slug": r.GetString("slug")}
		switch kind {
		case "css":
			css.WriteString("\n")
			css.WriteString(code)
		case "js":
			if loc == "header" {
				jsHeader.WriteString("\n")
				jsHeader.WriteString(code)
			} else {
				jsFooter.WriteString("\n")
				jsFooter.WriteString(code)
			}
		case "shortcode":
			shorts[r.GetString("slug")] = code
		default:
			switch loc {
			case "footer":
				footer = append(footer, item)
			case "body_open":
				bodyOpen = append(bodyOpen, item)
			case "shortcode":
				shorts[r.GetString("slug")] = code
			default:
				header = append(header, item)
			}
		}
	}
	return map[string]any{
		"header": header, "footer": footer, "bodyOpen": bodyOpen,
		"css": css.String(), "jsHeader": jsHeader.String(), "jsFooter": jsFooter.String(),
		"shortcodes": shorts,
	}
}

func snippetMatches(r *core.Record, pageSlug string) bool {
	pages := stringList(r.Get("pages"))
	if len(pages) == 0 {
		return true
	}
	for _, p := range pages {
		if p == "*" || (pageSlug != "" && p == pageSlug) {
			return true
		}
	}
	return false
}

func snippetDTO(r *core.Record) map[string]any {
	pages := stringList(r.Get("pages"))
	if pages == nil {
		pages = []string{}
	}
	return map[string]any{
		"id": r.Id, "title": r.GetString("title"), "slug": r.GetString("slug"),
		"description": r.GetString("description"), "code": r.GetString("code"),
		"kind": r.GetString("kind"), "location": r.GetString("location"),
		"active": r.GetBool("active"), "priority": r.GetFloat("priority"),
		"pages":     pages,
		"updatedAt": iso(r.GetDateTime("updated")),
	}
}

func requireWpcode(e *core.RequestEvent) error {
	if !pluginbox.Enabled(e.App, "wpcode") {
		return e.ForbiddenError("افزونه کد سفارشی خاموش است. از بخش افزونه‌ها روشنش کنید.", nil)
	}
	return nil
}

func listSnippets(e *core.RequestEvent) error {
	if err := requireWpcode(e); err != nil {
		return err
	}
	recs, err := e.App.FindRecordsByFilter("snippets", "", "priority", 300, 0)
	if err != nil {
		return e.BadRequestError("اسنیپت‌ها خوانده نشد.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, snippetDTO(r))
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func getSnippet(e *core.RequestEvent) error {
	if err := requireWpcode(e); err != nil {
		return err
	}
	rec, err := mustRecord(e, "snippets", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	return e.JSON(http.StatusOK, snippetDTO(rec))
}

type snippetBody struct {
	Title       string   `json:"title"`
	Slug        string   `json:"slug"`
	Description string   `json:"description"`
	Code        string   `json:"code"`
	Kind        string   `json:"kind"`
	Location    string   `json:"location"`
	Active      bool     `json:"active"`
	Priority    float64  `json:"priority"`
	Pages       []string `json:"pages"`
}

func applySnippet(e *core.RequestEvent, rec *core.Record, body snippetBody, isNew bool) error {
	title := cleanText(body.Title, 160)
	if title == "" {
		return e.BadRequestError("عنوان لازم است.", nil)
	}
	switch body.Kind {
	case "html", "css", "js", "shortcode":
	default:
		return e.BadRequestError("نوع کد نامعتبر است.", nil)
	}
	switch body.Location {
	case "header", "footer", "body_open", "shortcode":
	default:
		body.Location = "header"
	}
	if body.Kind == "shortcode" {
		body.Location = "shortcode"
	}
	base := body.Slug
	if base == "" {
		base = title
	}
	except := ""
	if !isNew {
		except = rec.Id
	}
	slug, err := uniqueSlug(e.App, "snippets", base, except)
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}
	pages := make([]string, 0, len(body.Pages))
	for _, p := range body.Pages {
		p = cleanText(p, 80)
		if p != "" {
			pages = append(pages, p)
		}
		if len(pages) >= 40 {
			break
		}
	}
	if len(body.Code) > 500_000 {
		return e.BadRequestError("کد بیش از حد بلند است.", nil)
	}
	rec.Set("title", title)
	rec.Set("slug", slug)
	rec.Set("description", cleanText(body.Description, 300))
	rec.Set("code", body.Code)
	rec.Set("kind", body.Kind)
	rec.Set("location", body.Location)
	rec.Set("active", body.Active)
	rec.Set("priority", body.Priority)
	rec.Set("pages", pages)
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ذخیره اسنیپت ناموفق بود.", err)
	}
	return nil
}

func createSnippet(e *core.RequestEvent) error {
	if err := requireWpcode(e); err != nil {
		return err
	}
	var body snippetBody
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	col, err := e.App.FindCollectionByNameOrId("snippets")
	if err != nil {
		return e.InternalServerError("مجموعه اسنیپت نیست.", err)
	}
	rec := core.NewRecord(col)
	if err := applySnippet(e, rec, body, true); err != nil {
		return err
	}
	return e.JSON(http.StatusOK, snippetDTO(rec))
}

func updateSnippet(e *core.RequestEvent) error {
	if err := requireWpcode(e); err != nil {
		return err
	}
	rec, err := mustRecord(e, "snippets", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	var body snippetBody
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	if err := applySnippet(e, rec, body, false); err != nil {
		return err
	}
	return e.JSON(http.StatusOK, snippetDTO(rec))
}

func deleteSnippet(e *core.RequestEvent) error {
	if err := requireWpcode(e); err != nil {
		return err
	}
	rec, err := mustRecord(e, "snippets", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	if err := e.App.Delete(rec); err != nil {
		return e.BadRequestError("حذف ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}
