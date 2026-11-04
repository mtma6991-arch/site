package pluginbox

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/mtma6991-arch/site/backend/internal/util"
	"github.com/pocketbase/pocketbase/core"
)

type AdminLink struct {
	Menu string `json:"menu"`
	Path string `json:"path"`
}

type Manifest struct {
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	Version      string    `json:"version"`
	Description  string    `json:"description"`
	Author       string    `json:"author"`
	MinCms       string    `json:"minCms"`
	Elements     string    `json:"elements"`
	Admin        AdminLink `json:"admin"`
	Capabilities []string  `json:"capabilities"`
}

type Info struct {
	Manifest
	Enabled      bool `json:"enabled"`
	NeedsRebuild bool `json:"needsRebuild"`
	HasElements  bool `json:"hasElements"`
}

type PropOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type PropDef struct {
	Key        string       `json:"key"`
	Label      string       `json:"label"`
	Type       string       `json:"type"`
	Default    any          `json:"default,omitempty"`
	Options    []PropOption `json:"options,omitempty"`
	ItemFields []PropDef    `json:"itemFields,omitempty"`
}

type ElementDef struct {
	Type     string    `json:"type"`
	Label    string    `json:"label"`
	Category string    `json:"category"`
	Plugin   string    `json:"plugin"`
	Props    []PropDef `json:"props"`
}

func Dir() string {
	if v := strings.TrimSpace(os.Getenv("PLUGINS_DIR")); v != "" {
		return v
	}
	candidates := []string{"../plugins", "plugins", "/opt/site/plugins"}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			abs, err := filepath.Abs(c)
			if err == nil {
				return abs
			}
			return c
		}
	}
	abs, _ := filepath.Abs("../plugins")
	return abs
}

func Enabled(app core.App, slug string) bool {
	rec, err := app.FindFirstRecordByData("plugin_states", "slug", slug)
	if err != nil {
		return slug == "wpcode"
	}
	return rec.GetBool("enabled")
}

func List(app core.App) ([]Info, error) {
	root := Dir()
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return []Info{}, nil
		}
		return nil, err
	}
	out := []Info{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		man, err := readManifest(filepath.Join(root, e.Name()))
		if err != nil {
			continue
		}
		info := Info{Manifest: man, Enabled: Enabled(app, man.Slug)}
		if man.Elements != "" {
			if _, err := os.Stat(filepath.Join(root, e.Name(), man.Elements)); err == nil {
				info.HasElements = true
			}
		}
		out = append(out, info)
	}
	return out, nil
}

func Elements(app core.App, onlyEnabled bool) ([]ElementDef, error) {
	list, err := List(app)
	if err != nil {
		return nil, err
	}
	root := Dir()
	var out []ElementDef
	for _, p := range list {
		if onlyEnabled && !p.Enabled {
			continue
		}
		if p.Elements == "" {
			continue
		}
		b, err := os.ReadFile(filepath.Join(root, p.Slug, p.Elements))
		if err != nil {
			continue
		}
		var defs []ElementDef
		if err := json.Unmarshal(b, &defs); err != nil {
			continue
		}
		for i := range defs {
			if defs[i].Category == "" {
				defs[i].Category = "پلاگین"
			}
			defs[i].Plugin = p.Slug
			out = append(out, defs[i])
		}
	}
	if out == nil {
		out = []ElementDef{}
	}
	return out, nil
}

func SetEnabled(app core.App, slug string, enabled bool) error {
	if _, err := readManifest(filepath.Join(Dir(), slug)); err != nil {
		return errors.New("افزونه پیدا نشد")
	}
	rec, err := app.FindFirstRecordByData("plugin_states", "slug", slug)
	if err != nil {
		col, cerr := app.FindCollectionByNameOrId("plugin_states")
		if cerr != nil {
			return cerr
		}
		rec = core.NewRecord(col)
		rec.Set("slug", slug)
		rec.Set("config", map[string]any{})
	}
	rec.Set("enabled", enabled)
	return app.Save(rec)
}

func InstallZip(app core.App, r io.ReaderAt, size int64) (Info, bool, error) {
	if size <= 0 || size > 20<<20 {
		return Info{}, false, errors.New("حجم زیپ باید کمتر از ۲۰ مگابایت باشد")
	}
	zr, err := zip.NewReader(r, size)
	if err != nil {
		return Info{}, false, errors.New("فایل زیپ باز نشد")
	}
	tmp, err := os.MkdirTemp("", "negar-plugin-")
	if err != nil {
		return Info{}, false, err
	}
	defer os.RemoveAll(tmp)

	needsGo := false
	for _, f := range zr.File {
		if strings.HasPrefix(f.Name, "__MACOSX") || strings.HasSuffix(f.Name, ".DS_Store") {
			continue
		}
		dest, err := util.SafeJoin(tmp, f.Name)
		if err != nil {
			return Info{}, false, errors.New("ساختار زیپ نامعتبر است")
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(dest, 0o755); err != nil {
				return Info{}, false, err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return Info{}, false, err
		}
		src, err := f.Open()
		if err != nil {
			return Info{}, false, err
		}
		out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
		if err != nil {
			src.Close()
			return Info{}, false, err
		}
		_, copyErr := io.Copy(out, io.LimitReader(src, 20<<20))
		out.Close()
		src.Close()
		if copyErr != nil {
			return Info{}, false, copyErr
		}
		if strings.HasSuffix(f.Name, ".go") {
			needsGo = true
		}
	}

	base, err := findManifestRoot(tmp)
	if err != nil {
		return Info{}, false, err
	}
	man, err := readManifest(base)
	if err != nil {
		return Info{}, false, err
	}
	if !validSlug(man.Slug) {
		return Info{}, false, errors.New("شناسه افزونه فقط حروف کوچک انگلیسی، عدد و خط تیره است")
	}
	dest := filepath.Join(Dir(), man.Slug)
	if err := os.MkdirAll(Dir(), 0o755); err != nil {
		return Info{}, false, err
	}
	_ = os.RemoveAll(dest)
	if err := os.Rename(base, dest); err != nil {
		if err := copyTree(base, dest); err != nil {
			return Info{}, false, err
		}
	}
	_ = SetEnabled(app, man.Slug, false)
	info := Info{Manifest: man, Enabled: false, NeedsRebuild: needsGo, HasElements: man.Elements != ""}
	return info, needsGo, nil
}

func validSlug(s string) bool {
	if len(s) < 2 || len(s) > 40 {
		return false
	}
	for i, r := range s {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-'
		if !ok {
			return false
		}
		if i == 0 && (r == '-' || (r >= '0' && r <= '9')) {
			return false
		}
	}
	return true
}

func findManifestRoot(root string) (string, error) {
	if _, err := os.Stat(filepath.Join(root, "plugin.json")); err == nil {
		return root, nil
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return "", err
	}
	var dirs []string
	for _, e := range entries {
		if e.IsDir() && !strings.HasPrefix(e.Name(), ".") && e.Name() != "__MACOSX" {
			dirs = append(dirs, e.Name())
		}
	}
	if len(dirs) == 1 {
		sub := filepath.Join(root, dirs[0])
		if _, err := os.Stat(filepath.Join(sub, "plugin.json")); err == nil {
			return sub, nil
		}
	}
	return "", errors.New("plugin.json داخل زیپ پیدا نشد")
}

func readManifest(dir string) (Manifest, error) {
	b, err := os.ReadFile(filepath.Join(dir, "plugin.json"))
	if err != nil {
		return Manifest{}, err
	}
	var m Manifest
	if err := json.Unmarshal(b, &m); err != nil {
		return Manifest{}, errors.New("plugin.json نامعتبر است")
	}
	if strings.TrimSpace(m.Slug) == "" || strings.TrimSpace(m.Name) == "" {
		return Manifest{}, errors.New("نام و شناسه افزونه لازم است")
	}
	return m, nil
}

func copyTree(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	})
}
