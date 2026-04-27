package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"HeatTrace/analytics"
	"HeatTrace/config"
	"HeatTrace/filter"
	"HeatTrace/monitor"
	"HeatTrace/storage"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx   context.Context
	store *storage.JSONStore
	agg   *storage.Aggregator
	mon   *monitor.Monitor
	fltr  *filter.SensitiveFilter
	cfg   *config.Config
}

func NewApp() (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	store, err := storage.NewJSONStore()
	if err != nil {
		return nil, err
	}
	agg := storage.NewAggregator(store)
	fltr := filter.NewSensitiveFilter(cfg.BlacklistedApps, true)
	mon := monitor.New(store, fltr)

	return &App{
		store: store,
		agg:   agg,
		mon:   mon,
		fltr:  fltr,
		cfg:   cfg,
	}, nil
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if !a.cfg.MonitorEnabled {
		return
	}
	// Check accessibility first — fast, no prompt, no goroutines
	if !monitor.CheckAccessibility() {
		// Frontend will see access_err via GetMonitorStatus
		a.mon.SetAccessError("accessibility")
		return
	}
	// Permission granted — start monitor immediately
	go func() {
		if err := a.mon.Start(); err != nil {
			log.Printf("Monitor start failed: %v", err)
			runtime.EventsEmit(a.ctx, "monitor-error", err.Error())
		}
	}()
}

func (a *App) shutdown(ctx context.Context) {
	a.mon.Stop()
	a.store.Stop()
}

func (a *App) GetDailySummary(date string) (*storage.DailySummary, error) {
	return a.agg.GetDailySummary(date)
}

func (a *App) GetKeyboardStats(startDate, endDate string) (*analytics.KeyboardStats, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	stats := analytics.ComputeKeyboardStats(days)
	return &stats, nil
}

func (a *App) GetMouseStats(startDate, endDate string) (*analytics.MouseStats, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	stats := analytics.ComputeMouseStats(days)
	return &stats, nil
}

func (a *App) GetTypingSpeed(startDate, endDate string) (*analytics.TypingSpeed, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	stats := analytics.ComputeTypingSpeed(days)
	return &stats, nil
}

func (a *App) GetUsageTime(startDate, endDate string) (*analytics.UsageTime, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	stats := analytics.ComputeUsageTime(days)
	return &stats, nil
}

func (a *App) GetHeatmapData(startDate, endDate string) (*analytics.HeatmapData, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	data := analytics.ComputeHeatmapData(days)
	return &data, nil
}

func (a *App) GetConfig() *config.Config {
	return a.cfg
}

func (a *App) SaveConfig(cfg config.Config) error {
	a.cfg = &cfg
	a.fltr.SetBlacklist(cfg.BlacklistedApps)
	if cfg.MonitorEnabled && !a.mon.IsRunning() {
		return a.mon.Start()
	}
	if !cfg.MonitorEnabled && a.mon.IsRunning() {
		a.mon.Stop()
	}
	return config.Save(a.cfg)
}

type MonitorStatus struct {
	Running   bool   `json:"running"`
	AccessErr string `json:"access_err"`
}

func (a *App) GetMonitorStatus() MonitorStatus {
	return MonitorStatus{
		Running:   a.mon.IsRunning(),
		AccessErr: a.mon.AccessError(),
	}
}

type TestResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Count   int64  `json:"count"`
}

func (a *App) TestMonitor() TestResult {
	if !a.mon.IsRunning() {
		return TestResult{Success: false, Message: "Monitor is not running", Count: 0}
	}

	before := a.mon.EventCount()
	time.Sleep(2 * time.Second)
	after := a.mon.EventCount()

	received := after - before
	if received > 0 {
		return TestResult{
			Success: true,
			Message: fmt.Sprintf("Received %d events in 2 seconds", received),
			Count:   received,
		}
	}

	return TestResult{
		Success: false,
		Message: "No events received. Check accessibility permission.",
		Count:   0,
	}
}

func (a *App) GetEventCount() int64 {
	return a.mon.EventCount()
}

func (a *App) ToggleMonitor() bool {
	if a.mon.IsRunning() {
		a.mon.Stop()
	} else {
		if err := a.mon.Start(); err != nil {
			runtime.EventsEmit(a.ctx, "monitor-error", err.Error())
			return false
		}
	}
	a.cfg.MonitorEnabled = a.mon.IsRunning()
	_ = config.Save(a.cfg)
	return a.cfg.MonitorEnabled
}

type MouseTrailPoint struct {
	X     int `json:"x"`
	Y     int `json:"y"`
	ScreenW int `json:"screen_w"`
	ScreenH int `json:"screen_h"`
}

func (a *App) GetMouseTrail(hours int) []MouseTrailPoint {
	if hours <= 0 {
		hours = 1
	}
	now := time.Now()
	start := now.Add(-time.Duration(hours) * time.Hour)
	startDate := start.Format("2006-01-02")
	endDate := now.Format("2006-01-02")
	startMs := start.UnixMilli()

	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil
	}

	var trail []MouseTrailPoint
	// Downsample: take every Nth point to keep ~500 points max
	const maxPoints = 500
	for _, day := range days {
		for _, m := range day.Mouse.Moves {
			if m.Timestamp >= startMs {
				trail = append(trail, MouseTrailPoint{
					X: m.X, Y: m.Y, ScreenW: m.ScreenW, ScreenH: m.ScreenH,
				})
			}
		}
	}
	if len(trail) > maxPoints {
		step := len(trail) / maxPoints
		var sampled []MouseTrailPoint
		for i := 0; i < len(trail); i += step {
			sampled = append(sampled, trail[i])
		}
		trail = sampled
	}
	return trail
}

func (a *App) IsMonitoring() bool {
	return a.mon.IsRunning()
}

func (a *App) GetToday() string {
	return time.Now().Format("2006-01-02")
}

func (a *App) ShowWindow() {
	runtime.WindowShow(a.ctx)
}

func (a *App) Quit() {
	runtime.Quit(a.ctx)
}
