package routes

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"site/internal/plugins"
)

func Register(se *core.ServeEvent, reg *plugins.Registry) {
	se.Router.GET("/api/negar/health", func(e *core.RequestEvent) error {
		return e.JSON(http.StatusOK, map[string]any{"ok": true, "app": "negar"})
	})

	se.Router.GET("/api/negar/runtime", func(e *core.RequestEvent) error {
		return e.JSON(http.StatusOK, runtimePayload(e.App, reg, true))
	})

	staff := apis.RequireAuth("users")

	se.Router.GET("/api/negar/plugins", func(e *core.RequestEvent) error {
		if err := requireRole(e, "admin", "editor", "author"); err != nil {
			return err
		}
		return e.JSON(http.StatusOK, map[string]any{"plugins": runtimePayload(e.App, reg, false)["plugins"]})
	}).Bind(staff)

	se.Router.POST("/api/negar/plugins/{id}/toggle", func(e *core.RequestEvent) error {
		if err := requireRole(e, "admin", "editor"); err != nil {
			return err
		}
		id := e.Request.PathValue("id")
		rec, err := e.App.FindFirstRecordByFilter("plugins", "plugin_id = {:id}", dbx.Params{"id": id})
		if err != nil {
			return e.NotFoundError("plugin not found", err)
		}
		rec.Set("enabled", !rec.GetBool("enabled"))
		if err := e.App.Save(rec); err != nil {
			return e.BadRequestError("could not toggle plugin", err)
		}
		return e.JSON(http.StatusOK, map[string]any{"id": id, "enabled": rec.GetBool("enabled")})
	}).Bind(staff)

	se.Router.POST("/api/negar/plugins/install", func(e *core.RequestEvent) error {
		if err := requireRole(e, "admin", "editor"); err != nil {
			return err
		}
		files, err := e.FindUploadedFiles("file")
		if err != nil || len(files) == 0 {
			return e.BadRequestError("file is required", err)
		}
		f := files[0]
		src, err := f.Reader.Open()
		if err != nil {
			return e.BadRequestError("could not read upload", err)
		}
		defer src.Close()
		tmp, err := os.CreateTemp("", "negar-plugin-*.zip")
		if err != nil {
			return e.InternalServerError("temp file", err)
		}
		defer os.Remove(tmp.Name())
		if _, err := io.Copy(tmp, io.LimitReader(src, 20<<20+1)); err != nil {
			tmp.Close()
			return e.BadRequestError("could not store upload", err)
		}
		if err := tmp.Close(); err != nil {
			return err
		}
		info, err := os.Stat(tmp.Name())
		if err != nil {
			return err
		}
		zf, err := os.Open(tmp.Name())
		if err != nil {
			return err
		}
		defer zf.Close()
		id, err := plugins.InstallZip(reg.Dir, zf, info.Size())
		if err != nil {
			return e.BadRequestError(err.Error(), nil)
		}
		fresh, err := plugins.Sync(e.App, reg.Dir)
		if err != nil {
			return e.InternalServerError("sync failed", err)
		}
		reg.Items = fresh.Items
		return e.JSON(http.StatusOK, map[string]any{"id": id})
	}).Bind(staff)

	se.Router.DELETE("/api/negar/plugins/{id}", func(e *core.RequestEvent) error {
		if err := requireRole(e, "admin"); err != nil {
			return err
		}
		id := e.Request.PathValue("id")
		if id == "wpcode" {
			return e.BadRequestError("پلاگین کد سفارشی بخشی از هسته است و حذف نمی‌شود. می‌توانید آن را غیرفعال کنید.", nil)
		}
		item := reg.Get(id)
		if item == nil {
			return e.NotFoundError("plugin not found", nil)
		}
		if err := os.RemoveAll(item.Dir); err != nil {
			return e.InternalServerError("could not remove plugin", err)
		}
		if rec, err := e.App.FindFirstRecordByFilter("plugins", "plugin_id = {:id}", dbx.Params{"id": id}); err == nil {
			rec.Set("enabled", false)
			_ = e.App.Save(rec)
		}
		fresh, err := plugins.Sync(e.App, reg.Dir)
		if err != nil {
			return err
		}
		reg.Items = fresh.Items
		return e.JSON(http.StatusOK, map[string]any{"id": id, "removed": true})
	}).Bind(staff)

	se.Router.GET("/api/negar/plugin-assets/{plugin}/{path...}", func(e *core.RequestEvent) error {
		id := e.Request.PathValue("plugin")
		rel := e.Request.PathValue("path")
		item := reg.Get(id)
		if item == nil || !pluginEnabled(e.App, id) {
			return e.NotFoundError("not found", nil)
		}
		clean := filepath.Clean(rel)
		if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
			return e.NotFoundError("not found", nil)
		}
		full := filepath.Join(item.Dir, clean)
		root := filepath.Clean(item.Dir) + string(os.PathSeparator)
		if !strings.HasPrefix(full, root) {
			return e.NotFoundError("not found", nil)
		}
		body, err := os.ReadFile(full)
		if err != nil {
			return e.NotFoundError("not found", nil)
		}
		e.Response.Header().Set("Content-Type", contentType(full))
		e.Response.Header().Set("X-Content-Type-Options", "nosniff")
		e.Response.Header().Set("Cache-Control", "public, max-age=300")
		return e.Blob(http.StatusOK, contentType(full), body)
	})

	se.Router.POST("/api/negar/me", func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("auth required", nil)
		}
		var body struct {
			Name            string `json:"name"`
			OldPassword     string `json:"oldPassword"`
			Password        string `json:"password"`
			PasswordConfirm string `json:"passwordConfirm"`
		}
		if err := e.BindBody(&body); err != nil {
			return e.BadRequestError("invalid body", err)
		}
		rec := e.Auth
		if strings.TrimSpace(body.Name) != "" {
			rec.Set("name", strings.TrimSpace(body.Name))
		}
		if body.Password != "" || body.OldPassword != "" {
			if len(body.Password) < 8 {
				return e.BadRequestError("رمز جدید باید حداقل ۸ نویسه باشد", nil)
			}
			if body.Password != body.PasswordConfirm {
				return e.BadRequestError("تکرار رمز یکسان نیست", nil)
			}
			if !rec.ValidatePassword(body.OldPassword) {
				return e.BadRequestError("رمز فعلی نادرست است", nil)
			}
			rec.SetPassword(body.Password)
		}
		if err := e.App.Save(rec); err != nil {
			return e.BadRequestError("ذخیره نشد", err)
		}
		return e.JSON(http.StatusOK, map[string]any{
			"id": rec.Id, "email": rec.Email(), "name": rec.GetString("name"), "role": rec.GetString("role"),
		})
	}).Bind(staff)
}

func requireRole(e *core.RequestEvent, roles ...string) error {
	if e.Auth == nil {
		return e.UnauthorizedError("auth required", nil)
	}
	role := e.Auth.GetString("role")
	for _, r := range roles {
		if role == r {
			return nil
		}
	}
	return e.ForbiddenError("اجازهٔ این کار را ندارید", nil)
}

func pluginEnabled(app core.App, id string) bool {
	rec, err := app.FindFirstRecordByFilter("plugins", "plugin_id = {:id}", dbx.Params{"id": id})
	if err != nil {
		return false
	}
	return rec.GetBool("enabled")
}

func runtimePayload(app core.App, reg *plugins.Registry, onlyEnabled bool) map[string]any {
	settings := map[string]any{
		"site_name": "نگار",
		"tagline":   "",
		"menu":      []any{},
	}
	if rec, err := app.FindFirstRecordByFilter("settings", "key = 'site'"); err == nil {
		settings = map[string]any{
			"site_name":       rec.GetString("site_name"),
			"tagline":         rec.GetString("tagline"),
			"description":     rec.GetString("description"),
			"logo":            rec.GetString("logo"),
			"favicon":         rec.GetString("favicon"),
			"footer":          rec.GetString("footer"),
			"menu":            decodeJSON(rec, "menu"),
			"posts_per_page":  rec.GetInt("posts_per_page"),
			"seo_title":       rec.GetString("seo_title"),
			"seo_description": rec.GetString("seo_description"),
		}
	}

	snipRecs, _ := app.FindRecordsByFilter("snippets", "enabled = true", "-priority,created", 300, 0)
	snippets := make([]any, 0, len(snipRecs))
	wpcodeOn := pluginEnabled(app, "wpcode")
	// If the record does not exist yet, keep snippets working (fresh install race).
	if _, err := app.FindFirstRecordByFilter("plugins", "plugin_id = 'wpcode'"); err != nil {
		wpcodeOn = true
	}
	if wpcodeOn {
		for _, rec := range snipRecs {
			snippets = append(snippets, map[string]any{
				"id":          rec.Id,
				"name":        rec.GetString("name"),
				"description": rec.GetString("description"),
				"code":        rec.GetString("code"),
				"kind":        rec.GetString("kind"),
				"location":    rec.GetString("location"),
				"scope":       rec.GetString("scope"),
				"slugs":       rec.GetString("slugs"),
				"priority":    rec.GetInt("priority"),
			})
		}
	}

	list := make([]any, 0, len(reg.Items))
	for _, item := range reg.Items {
		on := pluginEnabled(app, item.ID)
		if onlyEnabled && !on {
			continue
		}
		assets := make([]string, 0, len(item.Assets))
		for _, a := range item.Assets {
			a = strings.TrimPrefix(filepath.ToSlash(a), "/")
			assets = append(assets, "/api/negar/plugin-assets/"+item.ID+"/"+a)
		}
		var blocks any
		if len(item.Blocks) > 0 {
			_ = json.Unmarshal(item.Blocks, &blocks)
		}
		var form any
		if len(item.SettingsForm) > 0 {
			_ = json.Unmarshal(item.SettingsForm, &form)
		}
		list = append(list, map[string]any{
			"id":           item.ID,
			"name":         item.Name,
			"version":      item.Version,
			"description":  item.Description,
			"author":       item.Author,
			"minCms":       item.MinCms,
			"admin":        item.Admin,
			"enabled":      on,
			"assets":       assets,
			"blocks":       blocks,
			"settingsForm": form,
		})
	}

	return map[string]any{
		"settings": settings,
		"snippets": snippets,
		"plugins":  list,
	}
}

func decodeJSON(rec *core.Record, key string) any {
	v := rec.Get(key)
	if v == nil {
		return nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	var out any
	if err := json.Unmarshal(b, &out); err != nil {
		return nil
	}
	return out
}

func contentType(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".css":
		return "text/css; charset=utf-8"
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".webp":
		return "image/webp"
	case ".json":
		return "application/json; charset=utf-8"
	case ".woff2":
		return "font/woff2"
	default:
		return "application/octet-stream"
	}
}
