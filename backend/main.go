package main

import (
	"log"
	"os"

	"github.com/mtma6991-arch/site/backend/internal/bootstrap"
	"github.com/mtma6991-arch/site/backend/internal/extend"
	"github.com/mtma6991-arch/site/backend/internal/httpapi"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	dataDir := os.Getenv("PB_DATA")
	if dataDir == "" {
		dataDir = "./pb_data"
	}

	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir: dataDir,
	})

	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		if err := e.Next(); err != nil {
			return err
		}
		if err := bootstrap.Ensure(e.App); err != nil {
			return err
		}
		return extend.RunBoot(e.App)
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		httpapi.Register(se)
		extend.Mount(se)
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
