package httpapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func login(e *core.RequestEvent) error {
	if !loginHits.allow(clientIP(e), 8, 10*time.Minute) {
		return e.TooManyRequestsError("چند دقیقه بعد دوباره تلاش کنید.", nil)
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	rec, err := e.App.FindAuthRecordByEmail("users", body.Email)
	if err != nil || rec == nil || !rec.ValidatePassword(body.Password) {
		return e.BadRequestError("ایمیل یا رمز نادرست است.", nil)
	}
	token, err := rec.NewAuthToken()
	if err != nil {
		return e.InternalServerError("صدور نشست ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"token": token, "user": userDTO(rec)})
}

func me(e *core.RequestEvent) error {
	return e.JSON(http.StatusOK, map[string]any{"user": userDTO(e.Auth)})
}

func changePassword(e *core.RequestEvent) error {
	var body struct {
		Current string `json:"current"`
		Next    string `json:"next"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	if len(body.Next) < 10 {
		return e.BadRequestError("رمز تازه حداقل ۱۰ نویسه باشد.", nil)
	}
	if !e.Auth.ValidatePassword(body.Current) {
		return e.BadRequestError("رمز فعلی نادرست است.", nil)
	}
	e.Auth.SetPassword(body.Next)
	if err := e.App.Save(e.Auth); err != nil {
		return e.BadRequestError("ذخیره رمز ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}

func listUsers(e *core.RequestEvent) error {
	recs, err := e.App.FindRecordsByFilter("users", "", "-created", 200, 0)
	if err != nil {
		return e.InternalServerError("خواندن کاربران ناموفق بود.", err)
	}
	items := make([]any, 0, len(recs))
	for _, r := range recs {
		items = append(items, userDTO(r))
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func createUser(e *core.RequestEvent) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Role     string `json:"role"`
	}
	if err := e.BindBody(&body); err != nil {
		return e.BadRequestError("درخواست نامعتبر است.", err)
	}
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || len(body.Password) < 10 {
		return e.BadRequestError("ایمیل و رمز حداقل ۱۰ نویسه‌ای لازم است.", nil)
	}
	if body.Role != "editor" {
		body.Role = "admin"
	}
	col, err := e.App.FindCollectionByNameOrId("users")
	if err != nil {
		return e.InternalServerError("مجموعه کاربران نیست.", err)
	}
	rec := core.NewRecord(col)
	rec.SetEmail(body.Email)
	rec.SetPassword(body.Password)
	rec.Set("name", cleanText(body.Name, 120))
	rec.Set("role", body.Role)
	rec.Set("verified", true)
	if err := e.App.Save(rec); err != nil {
		return e.BadRequestError("ساخت کاربر ناموفق بود. شاید ایمیل تکراری است.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"user": userDTO(rec)})
}

func deleteUser(e *core.RequestEvent) error {
	rec, err := mustRecord(e, "users", e.Request.PathValue("id"))
	if err != nil {
		return err
	}
	if rec.Id == e.Auth.Id {
		return e.BadRequestError("نمی‌توانید حساب خودتان را حذف کنید.", nil)
	}
	if err := e.App.Delete(rec); err != nil {
		return e.BadRequestError("حذف ناموفق بود.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true})
}

func stats(e *core.RequestEvent) error {
	pages, _ := e.App.CountRecords("pages")
	publishedPages, _ := e.App.CountRecords("pages", dbx.HashExp{"status": "published"})
	posts, _ := e.App.CountRecords("posts")
	publishedPosts, _ := e.App.CountRecords("posts", dbx.HashExp{"status": "published"})
	media, _ := e.App.CountRecords("media")
	forms, _ := e.App.CountRecords("form_submissions")
	return e.JSON(http.StatusOK, map[string]any{
		"pages": pages, "publishedPages": publishedPages,
		"posts": posts, "publishedPosts": publishedPosts,
		"media": media, "submissions": forms,
	})
}
