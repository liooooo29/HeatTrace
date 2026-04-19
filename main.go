package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app, err := NewApp()
	if err != nil {
		log.Fatal("Failed to initialize app: ", err)
	}

	appMenu := menu.NewMenu()

	fileMenu := appMenu.AddSubmenu("File")
	fileMenu.AddText("Open Dashboard", nil, func(_ *menu.CallbackData) {
		app.ShowWindow()
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("Toggle Monitor", nil, func(_ *menu.CallbackData) {
		app.ToggleMonitor()
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("Quit", nil, func(_ *menu.CallbackData) {
		go app.Quit()
	})

	err = wails.Run(&options.App{
		Title:             "HeatTrace",
		Width:             900,
		Height:            600,
		MinWidth:          700,
		MinHeight:         450,
		HideWindowOnClose: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Menu:             appMenu,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatal("Error: ", err.Error())
	}
}
