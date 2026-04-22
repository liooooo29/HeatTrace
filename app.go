package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync/atomic"
	"time"

	"HeatTrace/analytics"
	"HeatTrace/config"
	"HeatTrace/filter"
	"HeatTrace/monitor"
	"HeatTrace/storage"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx         context.Context
	store       *storage.JSONStore
	agg         *storage.Aggregator
	mon         *monitor.Monitor
	fltr        *filter.SensitiveFilter
	cfg         *config.Config
	dataVersion int64 // incremented on each data save
}

func NewApp() (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	store, err := storage.NewJSONStore(cfg.EffectiveDataDir())
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
	// Start version counter loop
	go a.dataVersionLoop()
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

// dataVersionLoop listens for data-change signals and bumps a version counter.
func (a *App) dataVersionLoop() {
	ch := a.mon.DataChanged()
	for {
		_, ok := <-ch
		if !ok {
			return
		}
		// Drain burst signals for 200ms
		drain := time.NewTimer(200 * time.Millisecond)
	loop:
		for {
			select {
			case <-ch:
				drain.Reset(200 * time.Millisecond)
			case <-drain.C:
				break loop
			}
		}
		atomic.AddInt64(&a.dataVersion, 1)
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "data-updated")
		}
	}
}

// GetDataVersion returns a counter that increments each time monitor data changes.
func (a *App) GetDataVersion() int64 {
	return atomic.LoadInt64(&a.dataVersion)
}

func (a *App) shutdown(ctx context.Context) {
	a.mon.Stop()
	a.store.Stop()
}

func (a *App) GetDailySummary(date string) (*storage.DailySummary, error) {
	return a.agg.GetDailySummary(date)
}

func (a *App) GetRangeSummary(startDate, endDate string) (*storage.DailySummary, error) {
	return a.agg.GetRangeSummary(startDate, endDate)
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
	// Load directly into monitor memory (no compute + replay)
	a.mon.ResetHeatmapCounts()
	for _, day := range days {
		for _, k := range day.Keyboard {
			if !k.Filtered && k.Key != "" {
				a.mon.IncrementHeatmapKey(k.Key)
			}
		}
	}
	return a.GetHeatmapCurrent(), nil
}

// GetHeatmapCurrent returns the in-memory heatmap (sorted by key for stable ordering).
func (a *App) GetHeatmapCurrent() *analytics.HeatmapData {
	counts, maxCount := a.mon.GetHeatmapCounts()
	keys := make([]analytics.KeyHeatPoint, 0, len(counts))
	sortedKeys := make([]string, 0, len(counts))
	for k := range counts {
		sortedKeys = append(sortedKeys, k)
	}
	sort.Strings(sortedKeys)
	for _, key := range sortedKeys {
		count := counts[key]
		val := 0.0
		if maxCount > 0 {
			val = float64(count) / float64(maxCount)
		}
		keys = append(keys, analytics.KeyHeatPoint{Key: key, Count: count, Value: val})
	}
	return &analytics.HeatmapData{
		KeyboardLayout: analytics.KeyboardHeatmapPoints{Keys: keys},
	}
}

func (a *App) GetWeeklyReport() (*analytics.WeeklyReport, error) {
	now := time.Now()
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	monday := now.AddDate(0, 0, -weekday+1)
	thisStart := monday.Format("2006-01-02")
	thisEnd := now.Format("2006-01-02")
	prevStart := monday.AddDate(0, 0, -7).Format("2006-01-02")
	prevEnd := monday.AddDate(0, 0, -1).Format("2006-01-02")

	thisWeek, err := a.store.LoadDateRange(thisStart, thisEnd)
	if err != nil {
		return nil, err
	}
	prevWeek, _ := a.store.LoadDateRange(prevStart, prevEnd)

	report := analytics.ComputeWeeklyReport(thisWeek, prevWeek)
	return &report, nil
}

func (a *App) GetTypingRhythm(startDate, endDate string) ([]analytics.RhythmPoint, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	return analytics.ComputeTypingRhythm(days), nil
}

func (a *App) SaveReportImage(base64Data string) (string, error) {
	imgBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", err
	}
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save Weekly Report",
		Filters: []runtime.FileFilter{
			{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
		},
		DefaultFilename: fmt.Sprintf("weekly-report-%s.png", time.Now().Format("2006-01-02")),
	})
	if err != nil || savePath == "" {
		return "", err
	}
	return savePath, os.WriteFile(savePath, imgBytes, 0644)
}

func (a *App) GetConfig() *config.Config {
	return a.cfg
}

func (a *App) GetDefaultDataDir() string {
	return filepath.Join(config.DataDir(), "data")
}

func (a *App) PickDataDir() string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:                "Select Data Folder",
		CanCreateDirectories: true,
	})
	if err != nil {
		return ""
	}
	return dir
}

func (a *App) SwitchDataDir(newDir string) error {
	if newDir == "" {
		newDir = filepath.Join(config.DataDir(), "data")
	}
	oldDir := a.cfg.EffectiveDataDir()
	if oldDir == newDir {
		return nil
	}

	// Flush old store so all in-memory data is persisted to disk
	a.store.FlushAll()

	// Copy all data files from old dir to new dir
	if err := os.MkdirAll(newDir, 0755); err != nil {
		return fmt.Errorf("create new dir: %w", err)
	}
	entries, err := os.ReadDir(oldDir)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("read old dir: %w", err)
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		src := filepath.Join(oldDir, e.Name())
		dst := filepath.Join(newDir, e.Name())
		data, err := os.ReadFile(src)
		if err != nil {
			return fmt.Errorf("read %s: %w", e.Name(), err)
		}
		if err := os.WriteFile(dst, data, 0644); err != nil {
			return fmt.Errorf("write %s: %w", e.Name(), err)
		}
	}

	// Stop monitor if running
	wasRunning := a.mon.IsRunning()
	if wasRunning {
		a.mon.Stop()
	}

	// Switch to new store
	a.store.Stop()
	newStore, err := storage.NewJSONStore(newDir)
	if err != nil {
		return err
	}
	a.store = newStore
	a.agg = storage.NewAggregator(newStore)
	a.mon = monitor.New(newStore, a.fltr)

	// Update config
	a.cfg.DataDir = newDir
	_ = config.Save(a.cfg)

	// Restart monitor if it was running
	if wasRunning {
		_ = a.mon.Start()
	}
	return nil
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

func (a *App) GetKeyCount() int64 {
	return a.mon.KeyCount()
}

func (a *App) GetMouseClickCount() int64 {
	return a.mon.MouseClickCount()
}

func (a *App) GetLastKeyEvent() monitor.LastKeyEvent {
	return a.mon.LastKeyEvent()
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

func (a *App) ClearAllData() error {
	if a.mon.IsRunning() {
		a.mon.Stop()
	}
	return os.RemoveAll(config.DataDir())
}
