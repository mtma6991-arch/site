package main

import (
	"log"
	"os"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"site/internal/plugins"
	"site/internal/routes"
	"site/internal/schema"
	"site/internal/seed"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := schema.Ensure(se.App); err != nil {
			return err
		}
		if err := seed.Ensure(se.App); err != nil {
			return err
		}
		dir := os.Getenv("NEGAR_PLUGINS")
		if dir == "" {
			dir = "../plugins"
		}
		reg, err := plugins.Sync(se.App, dir)
		if err != nil {
			return err
		}
		routes.Register(se, reg)
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
