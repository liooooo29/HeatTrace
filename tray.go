package main

import (
	_ "embed"
	"fmt"
	"time"

	"fyne.io/systray"
)

//go:embed build/appicon.png
var trayIcon []byte

type Tray struct {
	app        *App
	showWindow func()
	quit       func()

	mKeys   *systray.MenuItem
	mClicks *systray.MenuItem
	mActive *systray.MenuItem
}

func NewTray(app *App, showWindow func(), quit func()) *Tray {
	return &Tray{app: app, showWindow: showWindow, quit: quit}
}

func (t *Tray) Run() {
	systray.Run(t.onReady, t.onExit)
}

func (t *Tray) onReady() {
	systray.SetIcon(trayIcon)
	systray.SetTitle("HeatTrace")
	systray.SetTooltip("HeatTrace - Input Monitor")

	// Summary section (disabled items = display only)
	t.mKeys = systray.AddMenuItem("Keys: 0", "Total keystrokes today")
	t.mKeys.Disable()
	t.mClicks = systray.AddMenuItem("Clicks: 0", "Total mouse clicks today")
	t.mClicks.Disable()
	t.mActive = systray.AddMenuItem("Active: 0 min", "Active time today")
	t.mActive.Disable()

	systray.AddSeparator()

	mShow := systray.AddMenuItem("Show Window", "Open HeatTrace")
	mQuit := systray.AddMenuItem("Quit", "Quit HeatTrace")

	// Refresh summary every 30s
	go t.refreshLoop()

	go func() {
		for {
			select {
			case <-mShow.ClickedCh:
				t.showWindow()
			case <-mQuit.ClickedCh:
				t.quit()
			}
		}
	}()
}

func (t *Tray) onExit() {}

func (t *Tray) refreshLoop() {
	t.refreshSummary()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		t.refreshSummary()
	}
}

func (t *Tray) refreshSummary() {
	today := time.Now().Format("2006-01-02")
	summary, err := t.app.GetDailySummary(today)
	if err != nil {
		return
	}
	t.mKeys.SetTitle(fmt.Sprintf("Keys: %d", summary.TotalKeys))
	t.mClicks.SetTitle(fmt.Sprintf("Clicks: %d", summary.MouseClickCount))
	t.mActive.SetTitle(fmt.Sprintf("Active: %d min", summary.ActiveMinutes))
}
