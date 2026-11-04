package plugins

import (
	"archive/zip"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

var idPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,48}$`)

type AdminLink struct {
	Menu  string `json:"menu"`
	Route string `json:"route"`
}

type Manifest struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Version     string          `json:"version"`
	Description string          `json:"description"`
	Author      string          `json:"author"`
	MinCms      string          `json:"minCms"`
	Admin       *AdminLink      `json:"admin"`
	Assets      []string        `json:"assets"`
	Raw         json.RawMessage `json:"-"`
}

type Loaded struct {
	Manifest
	Enabled      bool            `json:"enabled"`
	Blocks       json.RawMessage `json:"blocks"`
	SettingsForm json.RawMessage `json:"settingsForm"`
	Dir          string          `json:"-"`
}

type Registry struct {
	Dir   string
	Items []Loaded
}

func Sync(app core.App, dir string) (*Registry, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	reg := &Registry{Dir: dir}
	col, err := app.FindCollectionByNameOrId("plugins")
	if err != nil {
		return nil, err
	}
	for _, ent := range entries {
		if !ent.IsDir() {
			continue
		}
		pdir := filepath.Join(dir, ent.Name())
		manifest, err := readManifest(pdir)
		if err != nil {
			app.Logger().Warn("skip plugin", "dir", ent.Name(), "error", err)
			continue
		}
		if manifest.ID != ent.Name() {
			app.Logger().Warn("skip plugin: folder name must match id", "dir", ent.Name(), "id", manifest.ID)
			continue
		}
		rec, err := app.FindFirstRecordByFilter("plugins", "plugin_id = {:id}", dbx.Params{"id": manifest.ID})
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return nil, err
			}
			rec = core.NewRecord(col)
			rec.Set("plugin_id", manifest.ID)
			rec.Set("enabled", true)
		}
		rec.Set("name", manifest.Name)
		rec.Set("version", manifest.Version)
		rec.Set("manifest", map[string]any{
			"id": manifest.ID, "name": manifest.Name, "version": manifest.Version,
			"description": manifest.Description, "author": manifest.Author,
			"minCms": manifest.MinCms, "admin": manifest.Admin, "assets": manifest.Assets,
		})
		if err := app.Save(rec); err != nil {
			return nil, fmt.Errorf("sync %s: %w", manifest.ID, err)
		}
		item := Loaded{
			Manifest:     manifest,
			Enabled:      rec.GetBool("enabled"),
			Blocks:       readOptionalJSON(filepath.Join(pdir, "blocks.json")),
			SettingsForm: readOptionalJSON(filepath.Join(pdir, "admin.json")),
			Dir:          pdir,
		}
		reg.Items = append(reg.Items, item)
	}
	return reg, nil
}

func (r *Registry) Get(id string) *Loaded {
	for i := range r.Items {
		if r.Items[i].ID == id {
			return &r.Items[i]
		}
	}
	return nil
}

func readManifest(dir string) (Manifest, error) {
	b, err := os.ReadFile(filepath.Join(dir, "plugin.json"))
	if err != nil {
		return Manifest{}, err
	}
	var m Manifest
	if err := json.Unmarshal(b, &m); err != nil {
		return Manifest{}, err
	}
	m.ID = strings.TrimSpace(m.ID)
	if !idPattern.MatchString(m.ID) {
		return Manifest{}, fmt.Errorf("invalid plugin id %q", m.ID)
	}
	if strings.TrimSpace(m.Name) == "" {
		return Manifest{}, errors.New("plugin name is required")
	}
	if m.Version == "" {
		m.Version = "0.0.0"
	}
	m.Raw = b
	return m, nil
}

func readOptionalJSON(path string) json.RawMessage {
	b, err := os.ReadFile(path)
	if err != nil || !json.Valid(b) {
		return nil
	}
	return json.RawMessage(b)
}

// InstallZip extracts a plugin archive into the registry directory.
// The archive must contain plugin.json at its root, or inside a single folder.
func InstallZip(dir string, r io.ReaderAt, size int64) (string, error) {
	if size <= 0 || size > 20<<20 {
		return "", errors.New("plugin zip must be under 20MB")
	}
	zr, err := zip.NewReader(r, size)
	if err != nil {
		return "", err
	}
	var manifestPath string
	var rootPrefix string
	for _, f := range zr.File {
		name := filepath.ToSlash(f.Name)
		if strings.HasSuffix(name, "plugin.json") && !strings.Contains(name, "..") {
			depth := strings.Count(strings.Trim(name, "/"), "/")
			if depth == 0 {
				manifestPath = f.Name
				rootPrefix = ""
				break
			}
			if depth == 1 && manifestPath == "" {
				manifestPath = f.Name
				rootPrefix = strings.Split(strings.Trim(name, "/"), "/")[0] + "/"
			}
		}
	}
	if manifestPath == "" {
		return "", errors.New("plugin.json not found at the root of the zip")
	}
	mf, err := zr.Open(manifestPath)
	if err != nil {
		return "", err
	}
	raw, err := io.ReadAll(io.LimitReader(mf, 1<<20))
	mf.Close()
	if err != nil {
		return "", err
	}
	var m Manifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return "", err
	}
	if !idPattern.MatchString(m.ID) {
		return "", fmt.Errorf("invalid plugin id %q", m.ID)
	}
	dest := filepath.Join(dir, m.ID)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return "", err
	}
	for _, f := range zr.File {
		name := filepath.ToSlash(f.Name)
		if strings.HasPrefix(name, "__MACOSX/") || strings.HasSuffix(name, ".DS_Store") {
			continue
		}
		rel := name
		if rootPrefix != "" {
			if !strings.HasPrefix(name, rootPrefix) {
				continue
			}
			rel = strings.TrimPrefix(name, rootPrefix)
		}
		rel = strings.TrimPrefix(rel, "/")
		if rel == "" {
			continue
		}
		clean := filepath.Clean(rel)
		if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
			return "", fmt.Errorf("illegal path %q", rel)
		}
		target := filepath.Join(dest, clean)
		if !strings.HasPrefix(target, dest+string(os.PathSeparator)) && target != dest {
			return "", fmt.Errorf("path escapes plugin dir: %s", rel)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return "", err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return "", err
		}
		in, err := f.Open()
		if err != nil {
			return "", err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
		if err != nil {
			in.Close()
			return "", err
		}
		_, cpErr := io.Copy(out, io.LimitReader(in, 20<<20))
		out.Close()
		in.Close()
		if cpErr != nil {
			return "", cpErr
		}
	}
	if _, err := readManifest(dest); err != nil {
		return "", err
	}
	return m.ID, nil
}
