package httpapi

import (
	"io"
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

func mediaDTO(r *core.Record) map[string]any {
	name := r.GetString("file")
	return map[string]any{
		"id": r.Id, "url": fileURL("media", r.Id, name),
		"alt": r.GetString("alt"), "title": r.GetString("title"),
		"mime": r.GetString("mime"), "size": r.GetFloat("size"),
		"filename": name, "createdAt": iso(r.GetDateTime("created")),
	}
}

func listMedia(e *core.RequestEvent) error {
	q := strings.TrimSpace(e.Request.URL.Query().Get("q"))
	filter := ""
	var params map[string]any
	if q != "" {
		filter = "title ~ {:q} || alt ~ {:q}"
		params = map[string]any{"q": q}
	}
	recs, err := e.App.FindRecordsByFilter("media", filter, "-created", 300, 0, params)
	if err != nil {
		return e.BadRequestError("رسانه خوانده نشد.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, mediaDTO(r))
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func uploadMedia(e *core.RequestEvent) error {
	if err := e.Request.ParseMultipartForm(32 << 20); err != nil {
		return e.BadRequestError("فایل دریافت نشد.", err)
	}
	file, fh, err := e.Request.FormFile("file")
	if err != nil {
		return e.BadRequestError("فایل انتخاب نشده.", err)
	}
	defer file.Close()
	if fh.Size > 32<<20 {
		return e.BadRequestError("حجم فایل بیشتر از ۳۲ مگابایت است.", nil)
	}
	f, err := filesystem.NewFileFromMultipart(fh)
	if err != nil {
		return e.BadRequestError("خواندن فایل ناموفق بود.", err)
	}
	col, err := e.App.FindCollectionByNameOrId("media")
	if err != nil {
		return e.InternalServerError("مجموعه رسانه نیست.", err)
	}
	rec := core.NewRecord(col)
	title := cleanText(e.Request.FormValue("title"), 180)
	if title == "" {
		title = cleanText(fh.Filename, 180)
	}
	rec.Set("title", title)
	rec.Set("alt", cleanText(e.Request.FormValue("alt"), 240))
	rec.Set("mime", fh.Header.Get("Content-Type"))
	rec.Set("size", float64(fh.Size))
	rec.Set("file", f)
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ذخیره رسانه ناموفق بود. نوع فایل مجاز نیست.", err)
	}
	return e.JSON(http.StatusOK, mediaDTO(rec))
}

func updateMedia(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "media", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	var body struct {
		Alt   *string `json:"alt"`
		Title *string `json:"title"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	if body.Alt != nil {
		rec.Set("alt", cleanText(*body.Alt, 240))
	}
	if body.Title != nil {
		rec.Set("title", cleanText(*body.Title, 180))
	}
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ویرایش ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, mediaDTO(rec))
}

func deleteMedia(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "media", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	if err := e.App.Delete(rec); err != nil {
		return e.BadRequestError("حذف ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}

func readUpload(e *core.RequestEvent, field string, max int64) ([]byte, string, error) {
	if err := e.Request.ParseMultipartForm(max); err != nil {
		return nil, "", err
	}
	src, fh, err := e.Request.FormFile(field)
	if err != nil {
		return nil, "", err
	}
	defer src.Close()
	if fh.Size > max {
		return nil, "", io.ErrShortBuffer
	}
	b, err := io.ReadAll(io.LimitReader(src, max+1))
	if err != nil {
		return nil, "", err
	}
	if int64(len(b)) > max {
		return nil, "", io.ErrShortBuffer
	}
	return b, fh.Filename, nil
}
