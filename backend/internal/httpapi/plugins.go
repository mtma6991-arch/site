package httpapi

import (
	"bytes"
	"net/http"

	"github.com/mtma6991-arch/site/backend/internal/pluginbox"
	"github.com/pocketbase/pocketbase/core"
)

func listPlugins(e *core.RequestEvent) error {
	items, err := pluginbox.List(e.App)
	if err != nil {
		return e.InternalServerError("افزونه‌ها خوانده نشد.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func pluginElements(e *core.RequestEvent) error {
	items, err := pluginbox.Elements(e.App, true)
	if err != nil {
		return e.InternalServerError("المان‌ها خوانده نشد.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"items": items})
}

func enablePlugin(e *core.RequestEvent) error {
	slug := e.Request.PathValue("slug")
	if err := pluginbox.SetEnabled(e.App, slug, true); err != nil {
		return e.BadRequestError(err.Error(), err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true, "slug": slug, "enabled": true})
}

func disablePlugin(e *core.RequestEvent) error {
	slug := e.Request.PathValue("slug")
	if err := pluginbox.SetEnabled(e.App, slug, false); err != nil {
		return e.BadRequestError(err.Error(), err)
	}
	return e.JSON(http.StatusOK, map[string]any{"ok": true, "slug": slug, "enabled": false})
}

func uploadPlugin(e *core.RequestEvent) error {
	b, _, err := readUpload(e, "file", 20<<20)
	if err != nil {
		return e.BadRequestError("زیپ افزونه دریافت نشد یا بزرگ‌تر از حد مجاز است.", err)
	}
	info, needs, err := pluginbox.InstallZip(e.App, bytes.NewReader(b), int64(len(b)))
	if err != nil {
		return e.BadRequestError(err.Error(), err)
	}
	return e.JSON(http.StatusOK, map[string]any{
		"plugin": info, "needsRebuild": needs,
	})
}
