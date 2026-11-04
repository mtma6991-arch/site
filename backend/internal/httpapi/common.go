package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/mtma6991-arch/site/backend/internal/util"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func rawJSON(v any) []byte {
	switch t := v.(type) {
	case nil:
		return nil
	case types.JSONRaw:
		return append([]byte(nil), t...)
	case json.RawMessage:
		return append([]byte(nil), t...)
	case string:
		return []byte(t)
	case []byte:
		return t
	default:
		b, err := json.Marshal(t)
		if err != nil {
			return nil
		}
		return b
	}
}

func asAny(v any, empty any) any {
	b := rawJSON(v)
	if len(b) == 0 || string(b) == "null" {
		return empty
	}
	var out any
	if err := json.Unmarshal(b, &out); err != nil {
		return empty
	}
	return out
}

func stringList(v any) []string {
	b := rawJSON(v)
	if len(b) == 0 {
		return nil
	}
	var out []string
	if err := json.Unmarshal(b, &out); err != nil {
		return nil
	}
	return out
}

func iso(d types.DateTime) string {
	if d.IsZero() {
		return ""
	}
	return d.Time().UTC().Format(time.RFC3339)
}

func fileURL(collection, id, name string) string {
	if name == "" || id == "" {
		return ""
	}
	return "/api/files/" + collection + "/" + id + "/" + name
}

func userDTO(r *core.Record) map[string]any {
	return map[string]any{
		"id": r.Id, "email": r.Email(),
		"name": r.GetString("name"), "role": r.GetString("role"),
	}
}

func requireAdmin(e *core.RequestEvent) error {
	if e.Auth == nil || e.Auth.GetString("role") != "admin" {
		return e.ForbiddenError("فقط مدیر به این بخش دسترسی دارد.", nil)
	}
	return e.Next()
}

func uniqueSlug(app core.App, collection, base, except string) (string, error) {
	slug := util.Slugify(base)
	if util.Reserved(slug) {
		slug = slug + "-page"
	}
	for i := 0; i < 40; i++ {
		try := slug
		if i > 0 {
			try = fmt.Sprintf("%s-%d", slug, i+1)
		}
		rec, err := app.FindFirstRecordByData(collection, "slug", try)
		if err != nil || rec.Id == except {
			return try, nil
		}
	}
	return "", errors.New("نامک تکراری است")
}

func mustRecord(e *core.RequestEvent, collection, id string) (*core.Record, error) {
	rec, err := e.App.FindRecordById(collection, id)
	if err != nil || rec == nil {
		return nil, e.NotFoundError("مورد پیدا نشد.", err)
	}
	return rec, nil
}

type hitWindow struct {
	mu sync.Mutex
	m  map[string][]time.Time
}

func (h *hitWindow) allow(key string, limit int, window time.Duration) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.m == nil {
		h.m = map[string][]time.Time{}
	}
	now := time.Now()
	cut := now.Add(-window)
	prev := h.m[key]
	keep := make([]time.Time, 0, len(prev)+1)
	for _, t := range prev {
		if t.After(cut) {
			keep = append(keep, t)
		}
	}
	if len(keep) >= limit {
		h.m[key] = keep
		return false
	}
	h.m[key] = append(keep, now)
	return true
}

var (
	loginHits = &hitWindow{}
	formHits  = &hitWindow{}
)

func clientIP(e *core.RequestEvent) string {
	if ip := e.RealIP(); ip != "" {
		return ip
	}
	return e.RemoteIP()
}

func validateTree(raw json.RawMessage) error {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	var nodes []map[string]any
	if err := json.Unmarshal(raw, &nodes); err != nil {
		return errors.New("ساختار صفحه نامعتبر است")
	}
	n := 0
	var walk func([]map[string]any, int) error
	walk = func(items []map[string]any, depth int) error {
		if depth > 8 {
			return errors.New("عمق صفحه بیش از حد است")
		}
		for _, it := range items {
			n++
			if n > 400 {
				return errors.New("تعداد المان‌ها بیش از حد است")
			}
			if _, ok := it["type"].(string); !ok {
				return errors.New("یک المان نوع ندارد")
			}
			ch, ok := it["children"].([]any)
			if !ok {
				continue
			}
			sub := make([]map[string]any, 0, len(ch))
			for _, c := range ch {
				m, ok := c.(map[string]any)
				if !ok {
					return errors.New("فرزند نامعتبر است")
				}
				sub = append(sub, m)
			}
			if err := walk(sub, depth+1); err != nil {
				return err
			}
		}
		return nil
	}
	return walk(nodes, 1)
}

func cleanText(s string, max int) string {
	s = strings.TrimSpace(s)
	if max > 0 && len([]rune(s)) > max {
		r := []rune(s)
		return string(r[:max])
	}
	return s
}

func publishedBySlug(app core.App, collection, slug string) (*core.Record, error) {
	return app.FindFirstRecordByFilter(collection, "slug = {:slug} && status = 'published'", dbx.Params{"slug": slug})
}
