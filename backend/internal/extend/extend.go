package extend

import "github.com/pocketbase/pocketbase/core"

// افزونه‌های کامپایل‌شونده از این رجیستری استفاده می‌کنند.
// افزونه‌های اعلانی (plugin.json) نیازی به این بسته ندارند.

var (
	boots  []func(core.App) error
	routes []func(*core.ServeEvent)
)

// OnBoot تابعی را بعد از آماده‌شدن پایگاه داده اجرا می‌کند.
func OnBoot(fn func(core.App) error) {
	boots = append(boots, fn)
}

// OnServe مسیرهای سفارشی را هنگام بالا آمدن سرور ثبت می‌کند.
func OnServe(fn func(*core.ServeEvent)) {
	routes = append(routes, fn)
}

func RunBoot(app core.App) error {
	for _, fn := range boots {
		if err := fn(app); err != nil {
			app.Logger().Error("plugin boot failed", "error", err)
			return err
		}
	}
	return nil
}

func Mount(se *core.ServeEvent) {
	for _, fn := range routes {
		fn(se)
	}
}
