package httpapi

import (
	"net/http"

	"github.com/mtma6991-arch/site/backend/internal/bootstrap"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func Register(se *core.ServeEvent) {
	se.Router.BindFunc(func(e *core.RequestEvent) error {
		origin := e.Request.Header.Get("Origin")
		if origin != "" {
			h := e.Response.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Vary", "Origin")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		return e.Next()
	})

	r := se.Router.Group("/api/v1")
	r.OPTIONS("/{path...}", func(e *core.RequestEvent) error {
		return e.NoContent(http.StatusNoContent)
	})
	r.GET("/health", func(e *core.RequestEvent) error {
		return e.JSON(http.StatusOK, map[string]any{
			"ok": true, "product": "negar", "version": bootstrap.Version,
		})
	})

	r.POST("/auth/login", login)
	r.GET("/public/site", publicSite)
	r.GET("/public/pages/{slug}", publicPage)
	r.GET("/public/posts", publicPosts)
	r.GET("/public/posts/{slug}", publicPost)
	r.POST("/public/forms", publicForm)
	r.GET("/public/elements", publicElements)

	authed := r.Group("")
	authed.Bind(apis.RequireAuth("users"))
	authed.GET("/auth/me", me)
	authed.POST("/auth/password", changePassword)
	authed.GET("/stats", stats)

	authed.GET("/pages", listPages)
	authed.POST("/pages", createPage)
	authed.GET("/pages/{id}", getPage)
	authed.PUT("/pages/{id}", updatePage)
	authed.DELETE("/pages/{id}", deletePage)
	authed.POST("/pages/{id}/publish", publishPage)
	authed.POST("/pages/{id}/unpublish", unpublishPage)
	authed.POST("/pages/{id}/duplicate", duplicatePage)

	authed.GET("/posts", listPosts)
	authed.POST("/posts", createPost)
	authed.GET("/posts/{id}", getPost)
	authed.PUT("/posts/{id}", updatePost)
	authed.DELETE("/posts/{id}", deletePost)
	authed.POST("/posts/{id}/publish", publishPost)
	authed.POST("/posts/{id}/unpublish", unpublishPost)

	authed.GET("/media", listMedia)
	authed.POST("/media", uploadMedia)
	authed.PATCH("/media/{id}", updateMedia)
	authed.DELETE("/media/{id}", deleteMedia)

	authed.GET("/forms", listForms)
	authed.DELETE("/forms/{id}", deleteForm)
	authed.GET("/plugins", listPlugins)
	authed.GET("/plugins/elements", pluginElements)

	admin := r.Group("")
	admin.Bind(apis.RequireAuth("users"))
	admin.BindFunc(requireAdmin)
	admin.GET("/settings", getSettings)
	admin.PUT("/settings", putSettings)
	admin.POST("/settings/logo", uploadLogo)
	admin.GET("/users", listUsers)
	admin.POST("/users", createUser)
	admin.DELETE("/users/{id}", deleteUser)
	admin.POST("/plugins/upload", uploadPlugin)
	admin.POST("/plugins/{slug}/enable", enablePlugin)
	admin.POST("/plugins/{slug}/disable", disablePlugin)
	admin.GET("/snippets", listSnippets)
	admin.POST("/snippets", createSnippet)
	admin.GET("/snippets/{id}", getSnippet)
	admin.PUT("/snippets/{id}", updateSnippet)
	admin.DELETE("/snippets/{id}", deleteSnippet)
}
