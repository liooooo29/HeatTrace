//go:build !bindings

package main

import (
	"context"
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var iconPNG []byte

func main() {
	// Single-instance lock (platform-specific)
	lockDir := filepath.Join(os.TempDir(), "heattrace")
	_ = os.MkdirAll(lockDir, 0755)
	lockFile := filepath.Join(lockDir, "instance.lock")
	cleanup, err := acquireInstanceLock(lockFile)
	if err != nil {
		log.Println("HeatTrace is already running.")
		os.Exit(0)
	}
	defer cleanup()

	app, err := NewApp()
	if err != nil {
		log.Fatal("Failed to initialize app: ", err)
	}

	// Handle Ctrl+C / SIGTERM — force quit
	setupSignalHandler()

	tray := NewTray(app,
		func() { app.ShowWindow() },
		func() {
			// Stop monitor and store before exiting — ensures gohook is cleaned up
			app.mon.Stop()
			app.store.Stop()
			if app.ctx != nil {
				wailsRuntime.Quit(app.ctx)
			}
			os.Exit(0)
		},
	)

	// Start wails in background — tray blocks main goroutine
	go func() {
		err = wails.Run(&options.App{
			Title:     "HeatTrace",
			Width:     900,
			Height:    600,
			MinWidth:  700,
			MinHeight: 450,
			Frameless: true,
			AssetServer: &assetserver.Options{
				Assets: assets,
			},
			BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
			OnStartup:  app.startup,
			OnShutdown: app.shutdown,
			OnBeforeClose: func(ctx context.Context) bool {
				wailsRuntime.WindowHide(ctx)
				return true
			},
			Linux: &linux.Options{
				ProgramName: "HeatTrace",
				Icon:        iconPNG,
			},
			Bind: []interface{}{
				app,
			},
		})
		if err != nil {
			log.Fatal("Error: ", err.Error())
		}
	}()

	// systray.Run blocks until quit — this keeps the process alive
	tray.Run()
}
