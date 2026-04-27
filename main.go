//go:build !bindings

package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Single-instance lock via flock
	lockDir := filepath.Join(os.TempDir(), "heattrace")
	_ = os.MkdirAll(lockDir, 0755)
	lockFile := filepath.Join(lockDir, "instance.lock")
	lockF, err := os.OpenFile(lockFile, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		log.Fatal("Failed to create lock file: ", err)
	}
	if err := syscall.Flock(int(lockF.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		fmt.Println("HeatTrace is already running.")
		os.Exit(0)
	}
	defer func() {
		syscall.Flock(int(lockF.Fd()), syscall.LOCK_UN)
		lockF.Close()
		os.Remove(lockFile)
	}()

	app, err := NewApp()
	if err != nil {
		log.Fatal("Failed to initialize app: ", err)
	}

	// Handle Ctrl+C / SIGTERM — force quit
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		os.Exit(0)
	}()

	tray := NewTray(app,
		func() { app.ShowWindow() },
		func() {
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
