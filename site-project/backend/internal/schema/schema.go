package schema

import (
	"fmt"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

const (
	roleAdmin  = "admin"
	roleEditor = "editor"
	roleAuthor = "author"
)

func staffRule() string {
	return fmt.Sprintf(
		`@request.auth.role = "%s" || @request.auth.role = "%s" || @request.auth.role = "%s"`,
		roleAdmin, roleEditor, roleAuthor,
	)
}

func editorRule() string {
	return fmt.Sprintf(
		`@request.auth.role = "%s" || @request.auth.role = "%s"`,
		roleAdmin, roleEditor,
	)
}

func publishedOrStaff(field string) string {
	return fmt.Sprintf(`%s = "published" || %s`, field, staffRule())
}

// Ensure creates or updates the CMS collections. Safe to run on every boot.
func Ensure(app core.App) error {
	users, err := ensureUsers(app)
	if err != nil {
		return err
	}
	if err := ensureCategories(app); err != nil {
		return err
	}
	if err := ensureMedia(app); err != nil {
		return err
	}
	if err := ensurePages(app); err != nil {
		return err
	}
	if err := ensurePosts(app, users); err != nil {
		return err
	}
	if err := ensureSnippets(app); err != nil {
		return err
	}
	if err := ensurePlugins(app); err != nil {
		return err
	}
	if err := ensureSettings(app); err != nil {
		return err
	}
	if err := ensureSubmissions(app); err != nil {
		return err
	}
	if err := ensurePluginSettings(app); err != nil {
		return err
	}
	return nil
}

func ensureUsers(app core.App) (*core.Collection, error) {
	c, fresh, err := load(app, "users", true)
	if err != nil {
		return nil, err
	}
	_ = fresh
	addText(c, "name", false, 1, 160)
	if c.Fields.GetByName("role") == nil {
		c.Fields.Add(&core.SelectField{
			Name:      "role",
			MaxSelect: 1,
			Values:    []string{roleAdmin, roleEditor, roleAuthor},
		})
	}
	addTimestamps(c)
	// Login must keep working for the signed-in user. Writes are admin-only
	// so an author cannot promote their own role.
	c.ListRule = types.Pointer(staffRule())
	c.ViewRule = types.Pointer(staffRule() + ` || id = @request.auth.id`)
	c.CreateRule = types.Pointer(`@request.auth.role = "` + roleAdmin + `"`)
	c.UpdateRule = types.Pointer(`@request.auth.role = "` + roleAdmin + `"`)
	c.DeleteRule = types.Pointer(`@request.auth.role = "` + roleAdmin + `"`)
	if err := app.Save(c); err != nil {
		return nil, fmt.Errorf("users: %w", err)
	}
	return c, nil
}

func ensureCategories(app core.App) error {
	c, _, err := load(app, "categories", false)
	if err != nil {
		return err
	}
	addText(c, "name", true, 1, 120)
	addText(c, "slug", true, 1, 160)
	addTimestamps(c)
	ensureIndex(c, "idx_categories_slug", "CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)")
	publicRead(c)
	writeStaff(c)
	return save(app, c)
}

func ensureMedia(app core.App) error {
	c, _, err := load(app, "media", false)
	if err != nil {
		return err
	}
	if c.Fields.GetByName("file") == nil {
		c.Fields.Add(&core.FileField{
			Name:      "file",
			MaxSelect: 1,
			MaxSize:   20 << 20,
			Required:  true,
			Thumbs:    []string{"480x480f"},
			MimeTypes: []string{
				"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif",
				"video/mp4", "video/webm",
				"audio/mpeg", "audio/wav", "audio/ogg",
				"application/pdf",
			},
		})
	}
	addText(c, "title", false, 0, 200)
	addText(c, "alt", false, 0, 300)
	addTimestamps(c)
	publicRead(c)
	writeStaff(c)
	return save(app, c)
}

func ensurePages(app core.App) error {
	c, _, err := load(app, "pages", false)
	if err != nil {
		return err
	}
	addText(c, "title", true, 1, 200)
	addText(c, "slug", true, 1, 180)
	addSelect(c, "status", []string{"draft", "published"})
	addText(c, "seo_title", false, 0, 200)
	addText(c, "seo_description", false, 0, 400)
	addJSON(c, "document", 8<<20)
	addDate(c, "published_at")
	addTimestamps(c)
	ensureIndex(c, "idx_pages_slug", "CREATE UNIQUE INDEX idx_pages_slug ON pages (slug)")
	c.ListRule = types.Pointer(publishedOrStaff("status"))
	c.ViewRule = types.Pointer(publishedOrStaff("status"))
	writeStaff(c)
	return save(app, c)
}

func ensurePosts(app core.App, users *core.Collection) error {
	_ = users
	c, _, err := load(app, "posts", false)
	if err != nil {
		return err
	}
	addText(c, "title", true, 1, 220)
	addText(c, "slug", true, 1, 180)
	addText(c, "excerpt", false, 0, 600)
	if c.Fields.GetByName("content") == nil {
		c.Fields.Add(&core.EditorField{Name: "content", MaxSize: 8 << 20})
	}
	addText(c, "cover", false, 0, 2000)
	addSelect(c, "status", []string{"draft", "published"})
	addText(c, "category", false, 0, 160)
	addText(c, "tags", false, 0, 400)
	addText(c, "author_name", false, 0, 160)
	addDate(c, "published_at")
	addTimestamps(c)
	ensureIndex(c, "idx_posts_slug", "CREATE UNIQUE INDEX idx_posts_slug ON posts (slug)")
	c.ListRule = types.Pointer(publishedOrStaff("status"))
	c.ViewRule = types.Pointer(publishedOrStaff("status"))
	writeStaff(c)
	return save(app, c)
}

func ensureSnippets(app core.App) error {
	c, _, err := load(app, "snippets", false)
	if err != nil {
		return err
	}
	addText(c, "name", true, 1, 160)
	addText(c, "description", false, 0, 400)
	addText(c, "code", true, 0, 500000)
	addSelect(c, "kind", []string{"html", "css", "js", "jsonld"})
	addSelect(c, "location", []string{"head", "body_open", "body_close", "footer"})
	addSelect(c, "scope", []string{"all", "pages"})
	addText(c, "slugs", false, 0, 800)
	addNumber(c, "priority")
	addBool(c, "enabled")
	addTimestamps(c)
	// Snippets are served by the Go runtime endpoint. The collection itself
	// stays staff-only so disabled code is never listed publicly.
	staffOnly(c)
	return save(app, c)
}

func ensurePlugins(app core.App) error {
	c, _, err := load(app, "plugins", false)
	if err != nil {
		return err
	}
	addText(c, "plugin_id", true, 1, 60)
	addText(c, "name", false, 0, 160)
	addText(c, "version", false, 0, 40)
	addBool(c, "enabled")
	addJSON(c, "manifest", 1<<20)
	addTimestamps(c)
	ensureIndex(c, "idx_plugins_plugin_id", "CREATE UNIQUE INDEX idx_plugins_plugin_id ON plugins (plugin_id)")
	staffOnly(c)
	return save(app, c)
}

func ensureSettings(app core.App) error {
	c, _, err := load(app, "settings", false)
	if err != nil {
		return err
	}
	addText(c, "key", true, 1, 40)
	addText(c, "site_name", true, 1, 160)
	addText(c, "tagline", false, 0, 240)
	addText(c, "description", false, 0, 600)
	addText(c, "logo", false, 0, 2000)
	addText(c, "favicon", false, 0, 2000)
	addText(c, "footer", false, 0, 600)
	addJSON(c, "menu", 200000)
	addNumber(c, "posts_per_page")
	addText(c, "seo_title", false, 0, 200)
	addText(c, "seo_description", false, 0, 400)
	addTimestamps(c)
	ensureIndex(c, "idx_settings_key", "CREATE UNIQUE INDEX idx_settings_key ON settings (key)")
	publicRead(c)
	c.CreateRule = types.Pointer(editorRule())
	c.UpdateRule = types.Pointer(editorRule())
	c.DeleteRule = types.Pointer(`@request.auth.role = "` + roleAdmin + `"`)
	return save(app, c)
}

func ensureSubmissions(app core.App) error {
	c, _, err := load(app, "submissions", false)
	if err != nil {
		return err
	}
	addText(c, "form", false, 0, 120)
	addText(c, "page", false, 0, 180)
	addJSON(c, "payload", 1<<20)
	addBool(c, "read")
	addTimestamps(c)
	c.ListRule = types.Pointer(staffRule())
	c.ViewRule = types.Pointer(staffRule())
	c.CreateRule = types.Pointer("")
	c.UpdateRule = types.Pointer(staffRule())
	c.DeleteRule = types.Pointer(editorRule())
	return save(app, c)
}

func ensurePluginSettings(app core.App) error {
	c, _, err := load(app, "plugin_settings", false)
	if err != nil {
		return err
	}
	addText(c, "plugin_id", true, 1, 60)
	addJSON(c, "data", 1<<20)
	addTimestamps(c)
	ensureIndex(c, "idx_plugin_settings_plugin_id", "CREATE UNIQUE INDEX idx_plugin_settings_plugin_id ON plugin_settings (plugin_id)")
	staffOnly(c)
	return save(app, c)
}

func load(app core.App, name string, auth bool) (*core.Collection, bool, error) {
	c, err := app.FindCollectionByNameOrId(name)
	if err == nil {
		return c, false, nil
	}
	if auth {
		return core.NewAuthCollection(name), true, nil
	}
	return core.NewBaseCollection(name), true, nil
}

func save(app core.App, c *core.Collection) error {
	if err := app.Save(c); err != nil {
		return fmt.Errorf("%s: %w", c.Name, err)
	}
	return nil
}

func publicRead(c *core.Collection) {
	c.ListRule = types.Pointer("")
	c.ViewRule = types.Pointer("")
}

func writeStaff(c *core.Collection) {
	rule := types.Pointer(staffRule())
	c.CreateRule = rule
	c.UpdateRule = rule
	c.DeleteRule = rule
}

func staffOnly(c *core.Collection) {
	rule := types.Pointer(staffRule())
	c.ListRule = rule
	c.ViewRule = rule
	c.CreateRule = rule
	c.UpdateRule = rule
	c.DeleteRule = types.Pointer(editorRule())
}

func addTimestamps(c *core.Collection) {
	if c.Fields.GetByName("created") == nil {
		c.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
	}
	if c.Fields.GetByName("updated") == nil {
		c.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
	}
}

func addText(c *core.Collection, name string, required bool, min, max int) {
	if c.Fields.GetByName(name) != nil {
		return
	}
	c.Fields.Add(&core.TextField{
		Name:     name,
		Required: required,
		Min:      min,
		Max:      max,
	})
}

func addSelect(c *core.Collection, name string, values []string) {
	if c.Fields.GetByName(name) != nil {
		return
	}
	c.Fields.Add(&core.SelectField{
		Name:      name,
		Required:  true,
		MaxSelect: 1,
		Values:    values,
	})
}

func addJSON(c *core.Collection, name string, max int64) {
	if c.Fields.GetByName(name) != nil {
		return
	}
	c.Fields.Add(&core.JSONField{Name: name, MaxSize: max})
}

func addBool(c *core.Collection, name string) {
	if c.Fields.GetByName(name) != nil {
		return
	}
	c.Fields.Add(&core.BoolField{Name: name})
}

func addNumber(c *core.Collection, name string) {
	if c.Fields.GetByName(name) != nil {
		return
	}
	c.Fields.Add(&core.NumberField{Name: name, OnlyInt: true})
}

func addDate(c *core.Collection, name string) {
	if c.Fields.GetByName(name) != nil {
		return
	}
	c.Fields.Add(&core.DateField{Name: name})
}

func ensureIndex(c *core.Collection, name, stmt string) {
	for _, idx := range c.Indexes {
		if strings.Contains(strings.ToLower(idx), strings.ToLower(name)) {
			return
		}
	}
	c.Indexes = append(c.Indexes, stmt)
}
