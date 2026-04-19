# HeatTrace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- []`) syntax for tracking.

**Goal:** Build a cross-platform (macOS/Windows/Linux) desktop app that monitors keyboard input and mouse movement, stores data locally as JSON files, and provides a modern UI with analytics dashboards.

**Architecture:** Wails v2 app with Go backend handling monitoring/storage/analytics via gohook + JSON files, and React/TypeScript frontend with Tailwind CSS + Recharts for visualization. App runs as a system tray daemon with an optional dashboard window.

**Tech Stack:** Go 1.23, Wails v2.12, gohook, React 18, TypeScript, Tailwind CSS, Recharts, heatmap.js, Vite 3

---

## File Structure Overview

```
HeatTrace/
├── main.go                          # Wails entry, tray setup
├── app.go                           # App struct, Wails-bound methods
├── monitor/
│   ├── monitor.go                   # Monitor lifecycle (start/stop)
│   ├── keyboard.go                  # Keyboard event listener
│   └── mouse.go                     # Mouse event listener
├── storage/
│   ├── storage.go                   # Store interface + event types
│   ├── json_store.go                # JSON file implementation
│   └── aggregator.go               # Query/aggregation logic
├── analytics/
│   ├── keyboard_stats.go            # Key frequency, combos
│   ├── mouse_stats.go               # Click distribution, distance
│   ├── typing_speed.go              # CPM/WPM calculation
│   ├── usage_time.go                # Active time tracking
│   └── heatmap.go                   # Heatmap data generation
├── filter/
│   └── sensitive.go                 # App blacklist + password detection
├── config/
│   └── config.go                    # Config load/save/types
└── frontend/
    └── src/
        ├── App.tsx                   # Root component + tab routing
        ├── main.tsx                  # Entry point
        ├── style.css                 # Tailwind directives + CSS vars
        ├── components/
        │   ├── NavBar.tsx            # Top tab navigation
        │   ├── Dashboard.tsx         # Overview panel
        │   ├── KeyboardPanel.tsx     # Keyboard analytics
        │   ├── MousePanel.tsx        # Mouse analytics
        │   ├── UsagePanel.tsx        # Usage time analytics
        │   ├── TypingPanel.tsx       # Typing speed analytics
        │   ├── SettingsPanel.tsx     # Settings page
        │   ├── ThemeToggle.tsx       # Dark/light toggle
        │   ├── DateRangePicker.tsx   # Date range selector
        │   ├── StatCard.tsx          # Reusable stat card
        │   ├── KeyboardHeatmap.tsx   # Keyboard layout heatmap
        │   └── MouseHeatmap.tsx      # Screen heatmap
        ├── hooks/
        │   └── useTheme.ts           # Theme state hook
        └── types/
            └── index.ts              # Shared TypeScript types
```

---

## Phase 1: Data Types & Storage

### Task 1: Define Go event types and storage interface

**Files:**
- Create: `storage/storage.go`

- [ ] **Step 1: Create `storage/storage.go` with event types and store interface**

```go
package storage

// KeyEvent represents a single keyboard event
type KeyEvent struct {
	Timestamp int64    `json:"ts"`
	Key       string   `json:"key"`
	Modifiers []string `json:"modifiers,omitempty"`
	App       string   `json:"app,omitempty"`
	Filtered  bool     `json:"filtered,omitempty"`
}

// MouseMove represents a sampled mouse position
type MouseMove struct {
	Timestamp int64 `json:"ts"`
	X         int   `json:"x"`
	Y         int   `json:"y"`
	ScreenW   int   `json:"screen_w"`
	ScreenH   int   `json:"screen_h"`
}

// MouseClick represents a mouse click event
type MouseClick struct {
	Timestamp int64  `json:"ts"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Button    string `json:"button"`
	App       string `json:"app,omitempty"`
}

// MouseData holds mouse events for one day
type MouseData struct {
	Moves  []MouseMove  `json:"moves"`
	Clicks []MouseClick `json:"clicks"`
}

// DayData holds all events for one day
type DayData struct {
	Date     string      `json:"date"`
	Keyboard []KeyEvent  `json:"keyboard"`
	Mouse    MouseData   `json:"mouse"`
}

// Store defines the storage interface
type Store interface {
	SaveKeyEvent(date string, event KeyEvent) error
	SaveMouseMove(date string, event MouseMove) error
	SaveMouseClick(date string, event MouseClick) error
	LoadDay(date string) (*DayData, error)
	LoadDateRange(startDate, endDate string) ([]DayData, error)
	ListDates() ([]string, error)
	DeleteOlderThan(days int) error
}
```

- [ ] **Step 2: Create `config/config.go` with config types**

```go
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	MonitorEnabled       bool     `json:"monitor_enabled"`
	MouseSampleInterval  int      `json:"mouse_sample_interval_ms"`
	BlacklistedApps      []string `json:"blacklisted_apps"`
	Theme                string   `json:"theme"` // "light", "dark", "auto"
	DataRetentionDays    int      `json:"data_retention_days"`
}

func DefaultConfig() *Config {
	return &Config{
		MonitorEnabled:      true,
		MouseSampleInterval: 100,
		BlacklistedApps:     []string{},
		Theme:               "auto",
		DataRetentionDays:   90,
	}
}

func DataDir() string {
	home, _ := os.UserHomeDir()
	switch {
	case isMac():
		return filepath.Join(home, "Library", "Application Support", "HeatTrace")
	case isWindows():
		return filepath.Join(os.Getenv("APPDATA"), "HeatTrace")
	default:
		return filepath.Join(home, ".config", "heattrace")
	}
}

func ConfigPath() string {
	return filepath.Join(DataDir(), "config.json")
}

func Load() (*Config, error) {
	data, err := os.ReadFile(ConfigPath())
	if err != nil {
		if os.IsNotExist(err) {
			cfg := DefaultConfig()
			_ = Save(cfg)
			return cfg, nil
		}
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func Save(cfg *Config) error {
	dir := DataDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigPath(), data, 0644)
}

func isMac() bool   { /* runtime.GOOS == "darwin" */ return false }
func isWindows() bool { /* runtime.GOOS == "windows" */ return false }
```

Note: `isMac` and `isWindows` above use build tags or `runtime.GOOS` — use `runtime.GOOS` directly in the implementation.

- [ ] **Step 3: Create `storage/json_store.go` implementing the Store interface**

```go
package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"HeatTrace/config"
)

type JSONStore struct {
	mu      sync.Mutex
	dataDir string
	dayCache map[string]*DayData
}

func NewJSONStore() (*JSONStore, error) {
	dataDir := filepath.Join(config.DataDir(), "data")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}
	return &JSONStore{
		dataDir:  dataDir,
		dayCache: make(map[string]*DayData),
	}, nil
}

func (s *JSONStore) filePath(date string) string {
	return filepath.Join(s.dataDir, date+".json")
}

func (s *JSONStore) loadOrCreate(date string) (*DayData, error) {
	if cached, ok := s.dayCache[date]; ok {
		return cached, nil
	}
	data, err := os.ReadFile(s.filePath(date))
	if err != nil {
		if os.IsNotExist(err) {
			day := &DayData{Date: date, Mouse: MouseData{Moves: []MouseMove{}, Clicks: []MouseClick{}}, Keyboard: []KeyEvent{}}
			s.dayCache[date] = day
			return day, nil
		}
		return nil, err
	}
	var day DayData
	if err := json.Unmarshal(data, &day); err != nil {
		return nil, err
	}
	if day.Keyboard == nil {
		day.Keyboard = []KeyEvent{}
	}
	if day.Mouse.Moves == nil {
		day.Mouse.Moves = []MouseMove{}
	}
	if day.Mouse.Clicks == nil {
		day.Mouse.Clicks = []MouseClick{}
	}
	s.dayCache[date] = &day
	return &day, nil
}

func (s *JSONStore) flush(date string) error {
	day, ok := s.dayCache[date]
	if !ok {
		return nil
	}
	data, err := json.Marshal(day)
	if err != nil {
		return err
	}
	return os.WriteFile(s.filePath(date), data, 0644)
}

func (s *JSONStore) SaveKeyEvent(date string, event KeyEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.loadOrCreate(date)
	if err != nil {
		return err
	}
	day.Keyboard = append(day.Keyboard, event)
	return s.flush(date)
}

func (s *JSONStore) SaveMouseMove(date string, event MouseMove) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.loadOrCreate(date)
	if err != nil {
		return err
	}
	day.Mouse.Moves = append(day.Mouse.Moves, event)
	return s.flush(date)
}

func (s *JSONStore) SaveMouseClick(date string, event MouseClick) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.loadOrCreate(date)
	if err != nil {
		return err
	}
	day.Mouse.Clicks = append(day.Mouse.Clicks, event)
	return s.flush(date)
}

func (s *JSONStore) LoadDay(date string) (*DayData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.loadOrCreate(date)
}

func (s *JSONStore) LoadDateRange(startDate, endDate string) ([]DayData, error) {
	dates, err := s.ListDates()
	if err != nil {
		return nil, err
	}
	var result []DayData
	for _, d := range dates {
		if d >= startDate && d <= endDate {
			day, err := s.LoadDay(d)
			if err != nil {
				return nil, err
			}
			result = append(result, *day)
		}
	}
	return result, nil
}

func (s *JSONStore) ListDates() ([]string, error) {
	entries, err := os.ReadDir(s.dataDir)
	if err != nil {
		return nil, err
	}
	var dates []string
	for _, e := range entries {
		name := e.Name()
		if strings.HasSuffix(name, ".json") && !e.IsDir() {
			dates = append(dates, strings.TrimSuffix(name, ".json"))
		}
	}
	sort.Strings(dates)
	return dates, nil
}

func (s *JSONStore) DeleteOlderThan(days int) error {
	// Implementation: list dates, delete files older than N days
	return nil // TODO: implement
}
```

- [ ] **Step 4: Commit**

```bash
git add storage/ config/
git commit -m "feat: define event types, config, and JSON store"
```

### Task 2: Create aggregator for data queries

**Files:**
- Create: `storage/aggregator.go`

- [ ] **Step 1: Create `storage/aggregator.go` with query helpers**

```go
package storage

import (
	"math"
	"time"
)

// DailySummary holds pre-computed stats for a single day
type DailySummary struct {
	Date            string  `json:"date"`
	TotalKeys       int     `json:"total_keys"`
	FilteredKeys    int     `json:"filtered_keys"`
	MouseMoveCount  int     `json:"mouse_move_count"`
	MouseClickCount int     `json:"mouse_click_count"`
	MouseDistance   float64 `json:"mouse_distance_meters"`
	ActiveMinutes   int     `json:"active_minutes"`
	TopKeys         []KeyCount `json:"top_keys"`
}

type KeyCount struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

type Aggregator struct {
	store Store
}

func NewAggregator(store Store) *Aggregator {
	return &Aggregator{store: store}
}

func (a *Aggregator) GetDailySummary(date string) (*DailySummary, error) {
	day, err := a.store.LoadDay(date)
	if err != nil {
		return nil, err
	}

	keyFreq := make(map[string]int)
	totalKeys := 0
	filteredKeys := 0
	for _, k := range day.Keyboard {
		totalKeys++
		if k.Filtered {
			filteredKeys++
			continue
		}
		keyFreq[k.Key]++
	}

	topKeys := topN(keyFreq, 20)

	mouseDistance := calculateMouseDistance(day.Mouse.Moves)

	activeMinutes := calculateActiveMinutes(day.Keyboard, day.Mouse.Clicks)

	return &DailySummary{
		Date:            date,
		TotalKeys:       totalKeys,
		FilteredKeys:    filteredKeys,
		MouseMoveCount:  len(day.Mouse.Moves),
		MouseClickCount: len(day.Mouse.Clicks),
		MouseDistance:   mouseDistance,
		ActiveMinutes:   activeMinutes,
		TopKeys:         topKeys,
	}, nil
}

func calculateMouseDistance(moves []MouseMove) float64 {
	var total float64
	for i := 1; i < len(moves); i++ {
		dx := float64(moves[i].X - moves[i-1].X)
		dy := float64(moves[i].Y - moves[i-1].Y)
		total += math.Sqrt(dx*dx + dy*dy)
	}
	// Convert pixels to meters (approximate: 1 pixel ~ 0.264mm at 96 DPI)
	return total * 0.000264
}

func calculateActiveMinutes(keys []KeyEvent, clicks []MouseClick) int {
	if len(keys) == 0 && len(clicks) == 0 {
		return 0
	}
	var minTS, maxTS int64 = math.MaxInt64, 0
	for _, k := range keys {
		if k.Timestamp < minTS {
			minTS = k.Timestamp
		}
		if k.Timestamp > maxTS {
			maxTS = k.Timestamp
		}
	}
	for _, c := range clicks {
		if c.Timestamp < minTS {
			minTS = c.Timestamp
		}
		if c.Timestamp > maxTS {
			maxTS = c.Timestamp
		}
	}
	duration := time.Duration(maxTS-minTS) * time.Millisecond
	return int(duration.Minutes())
}

func topN(freq map[string]int, n int) []KeyCount {
	type kv struct {
		Key   string
		Count int
	}
	var sorted []kv
	for k, v := range freq {
		sorted = append(sorted, kv{k, v})
	}
	for i := 0; i < len(sorted); i++ {
		for j := i + 1; j < len(sorted); j++ {
			if sorted[j].Count > sorted[i].Count {
				sorted[i], sorted[j] = sorted[j], sorted[i]
			}
		}
	}
	if len(sorted) > n {
		sorted = sorted[:n]
	}
	result := make([]KeyCount, len(sorted))
	for i, s := range sorted {
		result[i] = KeyCount{s.Key, s.Count}
	}
	return result
}
```

- [ ] **Step 2: Commit**

```bash
git add storage/aggregator.go
git commit -m "feat: add data aggregator for daily summaries"
```

---

## Phase 2: Keyboard & Mouse Monitoring

### Task 3: Install gohook and create monitor package

**Files:**
- Create: `monitor/monitor.go`
- Create: `monitor/keyboard.go`
- Create: `monitor/mouse.go`
- Modify: `go.mod` (via `go get`)

- [ ] **Step 1: Install gohook dependency**

Run: `go get github.com/robotn/gohook`

- [ ] **Step 2: Create `monitor/monitor.go` — lifecycle management**

```go
package monitor

import (
	"fmt"
	"sync"
	"HeatTrace/storage"
)

type Monitor struct {
	store       storage.Store
	keyChan     chan storage.KeyEvent
	mouseMoveChan chan storage.MouseMove
	mouseClickChan chan storage.MouseClick
	stopChan    chan struct{}
	wg          sync.WaitGroup
	running     bool
	mu          sync.Mutex
}

func New(store storage.Store) *Monitor {
	return &Monitor{
		store:          store,
		keyChan:        make(chan storage.KeyEvent, 1000),
		mouseMoveChan:  make(chan storage.MouseMove, 1000),
		mouseClickChan: make(chan storage.MouseClick, 1000),
		stopChan:       make(chan struct{}),
	}
}

func (m *Monitor) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.running {
		return fmt.Errorf("monitor already running")
	}
	m.running = true
	m.stopChan = make(chan struct{})

	m.wg.Add(3)
	go m.writeLoop()
	go m.startKeyboardListener()
	go m.startMouseListener()

	return nil
}

func (m *Monitor) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.running {
		return
	}
	m.running = false
	close(m.stopChan)
	m.wg.Wait()
}

func (m *Monitor) IsRunning() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.running
}

func (m *Monitor) writeLoop() {
	defer m.wg.Done()
	for {
		select {
		case <-m.stopChan:
			return
		case ev := <-m.keyChan:
			date := dateFromTimestamp(ev.Timestamp)
			_ = m.store.SaveKeyEvent(date, ev)
		case ev := <-m.mouseMoveChan:
			date := dateFromTimestamp(ev.Timestamp)
			_ = m.store.SaveMouseMove(date, ev)
		case ev := <-m.mouseClickChan:
			date := dateFromTimestamp(ev.Timestamp)
			_ = m.store.SaveMouseClick(date, ev)
		}
	}
}

func dateFromTimestamp(ts int64) string {
	t := time.UnixMilli(ts)
	return t.Format("2006-01-02")
}
```

Note: Add `import "time"` to the imports.

- [ ] **Step 3: Create `monitor/keyboard.go` — keyboard event listener**

```go
package monitor

import (
	robotn "github.com/robotn/gohook"
	"HeatTrace/storage"
	"time"
)

func (m *Monitor) startKeyboardListener() {
	defer m.wg.Done()
	evChan := robotn.Start()
	defer robotn.End()

	for {
		select {
		case <-m.stopChan:
			return
		case ev := <-evChan:
			if ev.Kind == robotn.KeyDown {
				ke := storage.KeyEvent{
					Timestamp: time.Now().UnixMilli(),
					Key:       keycodeToName(ev.Keychar, ev.Rawcode),
					Modifiers: extractModifiers(ev),
				}
				select {
				case m.keyChan <- ke:
				default:
					// channel full, drop event
				}
			}
		}
	}
}

func keycodeToName(keychar uint16, rawcode uint16) string {
	if keychar > 0 {
		return string(rune(keychar))
	}
	return fmt.Sprintf("raw:%d", rawcode)
}

func extractModifiers(ev robotn.Event) []string {
	var mods []string
	if ev.Mask&robotn.ShiftMask != 0 {
		mods = append(mods, "shift")
	}
	if ev.Mask&robotn.AltMask != 0 {
		mods = append(mods, "alt")
	}
	if ev.Mask&robotn.CtrlMask != 0 {
		mods = append(mods, "ctrl")
	}
	if ev.Mask&robotn.CmdMask != 0 {
		mods = append(mods, "meta")
	}
	return mods
}
```

Note: Add `import "fmt"` to the imports.

- [ ] **Step 4: Create `monitor/mouse.go` — mouse event listener**

```go
package monitor

import (
	robotn "github.com/robotn/gohook"
	"HeatTrace/storage"
	"time"
)

func (m *Monitor) startMouseListener() {
	defer m.wg.Done()
	// Mouse events come through the same gohook event channel
	// We handle them in keyboard.go's event loop as well,
	// but for clarity we set up a separate goroutine
	// that does periodic mouse position sampling.

	// Mouse click events are handled in the keyboard listener
	// (gohook sends all events through one channel).
	// For mouse moves, we sample periodically:
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	screenW, screenH := getScreenSize()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			x, y := getMousePosition()
			move := storage.MouseMove{
				Timestamp: time.Now().UnixMilli(),
				X:         x,
				Y:         y,
				ScreenW:   screenW,
				ScreenH:   screenH,
			}
			select {
			case m.mouseMoveChan <- move:
			default:
			}
		}
	}
}

// getMousePosition uses robotgo or gohook to get current mouse position.
// For now, we use a cross-platform approach via CGO/system calls.
func getMousePosition() (int, int) {
	// gohook doesn't expose position API directly.
	// Use robotgo or platform-specific calls.
	// Placeholder: return 0,0 — will be replaced with actual implementation.
	return 0, 0
}

func getScreenSize() (int, int) {
	// Platform-specific screen size detection.
	return 1920, 1080
}
```

Note: For mouse position, gohook doesn't provide a position getter. We will need to add `github.com/go-vgo/robotgo` as a dependency for `GetMousePos()` and `GetScreenSize()`, or use platform-specific syscalls. The gohook event channel also delivers mouse click/move events directly, so we should handle both approaches:
1. Capture click events from the gohook channel in `keyboard.go` (handle `MouseDown` kind)
2. Use `robotgo.GetMousePos()` for periodic position sampling in `mouse.go`

- [ ] **Step 5: Update `keyboard.go` to also handle mouse click events from gohook**

Add to the event loop in `startKeyboardListener`:

```go
case ev.Kind == robotn.MouseDown:
    button := "left"
    if ev.Button == 3 {
        button = "right"
    } else if ev.Button == 2 {
        button = "middle"
    }
    click := storage.MouseClick{
        Timestamp: time.Now().UnixMilli(),
        X:         int(ev.X),
        Y:         int(ev.Y),
        Button:    button,
    }
    select {
    case m.mouseClickChan <- click:
    default:
    }
```

- [ ] **Step 6: Install robotgo for mouse position**

Run: `go get github.com/go-vgo/robotgo`

Update `getMousePosition()` and `getScreenSize()` in `mouse.go` to use `robotgo.GetMousePos()` and `robotgo.GetScreenSize()`.

- [ ] **Step 7: Commit**

```bash
git add monitor/ go.mod go.sum
git commit -m "feat: add keyboard and mouse monitoring with gohook + robotgo"
```

### Task 4: Create sensitive filter

**Files:**
- Create: `filter/sensitive.go`

- [ ] **Step 1: Create `filter/sensitive.go` with blacklist-based filtering**

```go
package filter

import (
	"strings"
	"HeatTrace/storage"
)

type SensitiveFilter struct {
	blacklistedApps map[string]bool
	enabled         bool
}

func NewSensitiveFilter(blacklistedApps []string, enabled bool) *SensitiveFilter {
	appMap := make(map[string]bool)
	for _, app := range blacklistedApps {
		appMap[strings.ToLower(app)] = true
	}
	return &SensitiveFilter{
		blacklistedApps: appMap,
		enabled:         enabled,
	}
}

func (f *SensitiveFilter) ShouldFilter(keyEvent storage.KeyEvent) bool {
	if !f.enabled {
		return false
	}
	if f.blacklistedApps[strings.ToLower(keyEvent.App)] {
		return true
	}
	return false
}

func (f *SensitiveFilter) SetBlacklist(apps []string) {
	f.blacklistedApps = make(map[string]bool)
	for _, app := range apps {
		f.blacklistedApps[strings.ToLower(app)] = true
	}
}

func (f *SensitiveFilter) SetEnabled(enabled bool) {
	f.enabled = enabled
}
```

Note: Platform-specific password detection (`IsPasswordInput()`) is complex and fragile. v1 uses app blacklist only. We can add platform-specific password detection later if needed.

- [ ] **Step 2: Wire filter into monitor**

Update `monitor/monitor.go` to accept and use the filter:

```go
// Add to Monitor struct:
filter *filter.SensitiveFilter

// Update New():
func New(store storage.Store, f *filter.SensitiveFilter) *Monitor

// In keyboard.go event handling, before sending to channel:
if m.filter.ShouldFilter(ke) {
    ke.Filtered = true
    ke.Key = ""
    ke.Modifiers = nil
}
```

- [ ] **Step 3: Commit**

```bash
git add filter/ monitor/
git commit -m "feat: add sensitive filter with app blacklist"
```

---

## Phase 3: Analytics Layer

### Task 5: Create analytics methods

**Files:**
- Create: `analytics/keyboard_stats.go`
- Create: `analytics/mouse_stats.go`
- Create: `analytics/typing_speed.go`
- Create: `analytics/usage_time.go`
- Create: `analytics/heatmap.go`

- [ ] **Step 1: Create `analytics/keyboard_stats.go`**

```go
package analytics

import (
	"HeatTrace/storage"
)

type KeyboardStats struct {
	TotalKeys    int                    `json:"total_keys"`
	FilteredKeys int                    `json:"filtered_keys"`
	KeyFrequency []storage.KeyCount     `json:"key_frequency"`
	ModCombo     []ModComboCount        `json:"mod_combos"`
	HourlyKeys   []HourlyCount         `json:"hourly_keys"`
}

type ModComboCount struct {
	Combo string `json:"combo"`
	Count int    `json:"count"`
}

type HourlyCount struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

func ComputeKeyboardStats(days []storage.DayData) KeyboardStats {
	keyFreq := make(map[string]int)
	modCombo := make(map[string]int)
	hourly := make(map[int]int)
	totalKeys := 0
	filteredKeys := 0

	for _, day := range days {
		for _, k := range day.Keyboard {
			totalKeys++
			if k.Filtered {
				filteredKeys++
				continue
			}
			keyFreq[k.Key]++
			if len(k.Modifiers) > 0 {
				combo := joinModifiers(k.Modifiers) + "+" + k.Key
				modCombo[combo]++
			}
			hour := hourFromTimestamp(k.Timestamp)
			hourly[hour]++
		}
	}

	return KeyboardStats{
		TotalKeys:    totalKeys,
		FilteredKeys: filteredKeys,
		KeyFrequency: topNKeys(keyFreq, 20),
		ModCombo:     topNModCombos(modCombo, 20),
		HourlyKeys:   buildHourlyCounts(hourly),
	}
}
```

- [ ] **Step 2: Create `analytics/mouse_stats.go`**

```go
package analytics

import (
	"math"
	"HeatTrace/storage"
)

type MouseStats struct {
	TotalClicks    int              `json:"total_clicks"`
	TotalMoves     int              `json:"total_moves"`
	TotalDistance  float64          `json:"total_distance_meters"`
	ClickHeatmap   []ClickPoint     `json:"click_heatmap"`
	LeftClicks     int              `json:"left_clicks"`
	RightClicks    int              `json:"right_clicks"`
	DailyDistance  []DailyDistPoint `json:"daily_distance"`
}

type ClickPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type DailyDistPoint struct {
	Date     string  `json:"date"`
	Distance float64 `json:"distance"`
}

func ComputeMouseStats(days []storage.DayData) MouseStats {
	var totalMoves, totalClicks, leftClicks, rightClicks int
	var totalDistance float64
	var clickPoints []ClickPoint
	var dailyDist []DailyDistPoint

	for _, day := range days {
		totalMoves += len(day.Mouse.Moves)
		totalClicks += len(day.Mouse.Clicks)

		dayDist := calculateDistance(day.Mouse.Moves)
		totalDistance += dayDist
		dailyDist = append(dailyDist, DailyDistPoint{Date: day.Date, Distance: dayDist})

		for _, c := range day.Mouse.Clicks {
			clickPoints = append(clickPoints, ClickPoint{X: c.X, Y: c.Y})
			if c.Button == "left" {
				leftClicks++
			} else if c.Button == "right" {
				rightClicks++
			}
		}
	}

	return MouseStats{
		TotalClicks:   totalClicks,
		TotalMoves:    totalMoves,
		TotalDistance: totalDistance,
		ClickHeatmap:  clickPoints,
		LeftClicks:    leftClicks,
		RightClicks:   rightClicks,
		DailyDistance: dailyDist,
	}
}

func calculateDistance(moves []storage.MouseMove) float64 {
	var total float64
	for i := 1; i < len(moves); i++ {
		dx := float64(moves[i].X - moves[i-1].X)
		dy := float64(moves[i].Y - moves[i-1].Y)
		total += math.Sqrt(dx*dx + dy*dy)
	}
	return total * 0.000264
}
```

- [ ] **Step 3: Create `analytics/typing_speed.go`**

```go
package analytics

import (
	"HeatTrace/storage"
)

type TypingSpeed struct {
	AverageCPM  float64          `json:"average_cpm"`
	AverageWPM  float64          `json:"average_wpm"`
	DailySpeed  []DailySpeedPoint `json:"daily_speed"`
	HourlySpeed []HourlySpeedPoint `json:"hourly_speed"`
}

type DailySpeedPoint struct {
	Date string  `json:"date"`
	CPM  float64 `json:"cpm"`
	WPM  float64 `json:"wpm"`
}

type HourlySpeedPoint struct {
	Hour int     `json:"hour"`
	CPM  float64 `json:"cpm"`
	WPM  float64 `json:"wpm"`
}

func ComputeTypingSpeed(days []storage.DayData) TypingSpeed {
	// CPM = characters per minute (count printable keys in active typing windows)
	// WPM = CPM / 5 (standard words-per-minute approximation)
	// Active typing window: consecutive keystrokes with gaps < 2 seconds
	return TypingSpeed{}
	// Full implementation: iterate days, group keystrokes into active windows,
	// compute CPM per window, average across windows.
}
```

Note: The full implementation groups keyboard events into "typing windows" (gaps < 2s = same window), counts characters per window, and computes CPM/WPM.

- [ ] **Step 4: Create `analytics/usage_time.go`**

```go
package analytics

import (
	"HeatTrace/storage"
)

type UsageTime struct {
	TotalMinutes    int                `json:"total_minutes"`
	DailyUsage      []DailyUsagePoint  `json:"daily_usage"`
	AppUsage        []AppUsagePoint    `json:"app_usage"`
}

type DailyUsagePoint struct {
	Date    string `json:"date"`
	Minutes int    `json:"minutes"`
}

type AppUsagePoint struct {
	App     string `json:"app"`
	Minutes int    `json:"minutes"`
}

func ComputeUsageTime(days []storage.DayData) UsageTime {
	// Aggregate active minutes per day, per app
	return UsageTime{}
}
```

- [ ] **Step 5: Create `analytics/heatmap.go`**

```go
package analytics

import (
	"HeatTrace/storage"
)

type HeatmapData struct {
	KeyboardLayout KeyboardHeatmapPoints `json:"keyboard_layout"`
	MouseHeatmap   MouseHeatmapPoints    `json:"mouse_heatmap"`
}

type KeyboardHeatmapPoints struct {
	Keys []KeyHeatPoint `json:"keys"`
}

type KeyHeatPoint struct {
	Key   string  `json:"key"`
	Count int     `json:"count"`
	Value float64 `json:"value"` // normalized 0-1
}

type MouseHeatmapPoints struct {
	Points []MouseHeatPoint `json:"points"`
}

type MouseHeatPoint struct {
	X     int     `json:"x"`
	Y     int     `json:"y"`
	Value float64 `json:"value"`
}

func ComputeHeatmapData(days []storage.DayData) HeatmapData {
	return HeatmapData{}
}
```

- [ ] **Step 6: Add shared helpers**

Create `analytics/helpers.go`:

```go
package analytics

import (
	"sort"
	"strings"
	"HeatTrace/storage"
	"time"
)

func hourFromTimestamp(ts int64) int {
	return time.UnixMilli(ts).Hour()
}

func joinModifiers(mods []string) string {
	sort.Strings(mods)
	return strings.Join(mods, "+")
}

func topNKeys(freq map[string]int, n int) []storage.KeyCount {
	type kv struct{ k string; v int }
	var sorted []kv
	for k, v := range freq {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].v > sorted[j].v })
	if len(sorted) > n { sorted = sorted[:n] }
	result := make([]storage.KeyCount, len(sorted))
	for i, s := range sorted {
		result[i] = storage.KeyCount{Key: s.k, Count: s.v}
	}
	return result
}

func topNModCombos(freq map[string]int, n int) []ModComboCount {
	type kv struct{ k string; v int }
	var sorted []kv
	for k, v := range freq {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].v > sorted[j].v })
	if len(sorted) > n { sorted = sorted[:n] }
	result := make([]ModComboCount, len(sorted))
	for i, s := range sorted {
		result[i] = ModComboCount{Combo: s.k, Count: s.v}
	}
	return result
}

func buildHourlyCounts(hourly map[int]int) []HourlyCount {
	result := make([]HourlyCount, 24)
	for h := 0; h < 24; h++ {
		result[h] = HourlyCount{Hour: h, Count: hourly[h]}
	}
	return result
}
```

- [ ] **Step 7: Commit**

```bash
git add analytics/
git commit -m "feat: add analytics computation layer"
```

---

## Phase 4: Wails Binding & App Integration

### Task 6: Wire everything into the Wails App

**Files:**
- Modify: `app.go`
- Modify: `main.go`

- [ ] **Step 1: Rewrite `app.go` — bind analytics and config methods**

```go
package main

import (
	"context"
	"fmt"
	"time"
	"HeatTrace/analytics"
	"HeatTrace/config"
	"HeatTrace/filter"
	"HeatTrace/monitor"
	"HeatTrace/storage"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx     context.Context
	store   *storage.JSONStore
	agg     *storage.Aggregator
	mon     *monitor.Monitor
	fltr    *filter.SensitiveFilter
	cfg     *config.Config
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
	if a.cfg.MonitorEnabled {
		_ = a.mon.Start()
	}
}

func (a *App) shutdown(ctx context.Context) {
	a.mon.Stop()
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

func (a *App) ToggleMonitor() bool {
	if a.mon.IsRunning() {
		a.mon.Stop()
	} else {
		_ = a.mon.Start()
	}
	a.cfg.MonitorEnabled = a.mon.IsRunning()
	_ = config.Save(a.cfg)
	return a.cfg.MonitorEnabled
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
```

- [ ] **Step 2: Rewrite `main.go` — configure Wails with tray and window hiding**

```go
package main

import (
	"embed"
	"log"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/standard"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app, err := NewApp()
	if err != nil {
		log.Fatal("Failed to initialize app:", err)
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
		app.mon.Stop()
	})

	err = wails.Run(&options.App{
		Title:     "HeatTrace",
		Width:     1100,
		Height:    700,
		MinWidth:  800,
		MinHeight: 500,
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
		log.Fatal("Error:", err.Error())
	}
}
```

Note: Wails v2 systray API varies by version. The `menu` approach above works for the app menu. For system tray, we need to use `options.Mac` / `options.Windows` / `options.Linux` with systray configuration. Check Wails docs for exact API.

- [ ] **Step 3: Update wails.json for system tray**

```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "HeatTrace",
  "outputfilename": "HeatTrace",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": {
    "name": "halalala222",
    "email": "1741196223@qq.com"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app.go main.go wails.json
git commit -m "feat: wire backend into Wails App with analytics bindings"
```

---

## Phase 5: Frontend Foundation

### Task 7: Set up Tailwind CSS and theme system

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/style.css` (rewrite)
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/hooks/useTheme.ts`

- [ ] **Step 1: Install frontend dependencies**

Run:
```bash
cd frontend
npm install tailwindcss@3 postcss autoprefixer recharts heatmap.js
npm install -D @types/heatmap.js
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`.

- [ ] **Step 2: Configure `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1e1e2e',
        },
        muted: {
          DEFAULT: '#64748b',
          dark: '#a6adc8',
        }
      },
      fontFamily: {
        sans: ['Nunito', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Rewrite `frontend/src/style.css` with Tailwind and theme CSS vars**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f8fafc;
  --fg: #0f172a;
  --card-bg: #ffffff;
  --border: #e2e8f0;
  --accent: #3b82f6;
  --muted: #64748b;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.dark {
  --bg: #0f172a;
  --fg: #f1f5f9;
  --card-bg: #1e293b;
  --border: #334155;
  --accent: #3b82f6;
  --muted: #94a3b8;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

body {
  margin: 0;
  background-color: var(--bg);
  color: var(--fg);
  font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background-color 0.2s, color 0.2s;
}

@font-face {
  font-family: "Nunito";
  font-style: normal;
  font-weight: 400;
  src: local(""),
    url("assets/fonts/nunito-v16-latin-regular.woff2") format("woff2");
}
```

- [ ] **Step 4: Create `frontend/src/types/index.ts`**

```typescript
export interface DailySummary {
  date: string;
  total_keys: number;
  filtered_keys: number;
  mouse_move_count: number;
  mouse_click_count: number;
  mouse_distance_meters: number;
  active_minutes: number;
  top_keys: KeyCount[];
}

export interface KeyCount {
  key: string;
  count: number;
}

export interface KeyboardStats {
  total_keys: number;
  filtered_keys: number;
  key_frequency: KeyCount[];
  mod_combos: ModComboCount[];
  hourly_keys: HourlyCount[];
}

export interface ModComboCount {
  combo: string;
  count: number;
}

export interface HourlyCount {
  hour: number;
  count: number;
}

export interface MouseStats {
  total_clicks: number;
  total_moves: number;
  total_distance_meters: number;
  click_heatmap: ClickPoint[];
  left_clicks: number;
  right_clicks: number;
  daily_distance: DailyDistPoint[];
}

export interface ClickPoint {
  x: number;
  y: number;
}

export interface DailyDistPoint {
  date: string;
  distance: number;
}

export interface TypingSpeed {
  average_cpm: number;
  average_wpm: number;
  daily_speed: DailySpeedPoint[];
  hourly_speed: HourlySpeedPoint[];
}

export interface DailySpeedPoint {
  date: string;
  cpm: number;
  wpm: number;
}

export interface HourlySpeedPoint {
  hour: number;
  cpm: number;
  wpm: number;
}

export interface UsageTime {
  total_minutes: number;
  daily_usage: DailyUsagePoint[];
  app_usage: AppUsagePoint[];
}

export interface DailyUsagePoint {
  date: string;
  minutes: number;
}

export interface AppUsagePoint {
  app: string;
  minutes: number;
}

export interface AppConfig {
  monitor_enabled: boolean;
  mouse_sample_interval_ms: number;
  blacklisted_apps: string[];
  theme: string;
  data_retention_days: number;
}

export type Tab = 'overview' | 'keyboard' | 'mouse' | 'usage' | 'typing' | 'settings';
```

- [ ] **Step 5: Create `frontend/src/hooks/useTheme.ts`**

```typescript
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';

export function useTheme(initial: Theme = 'auto') {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return { theme, setTheme };
}
```

- [ ] **Step 6: Delete old boilerplate files**

Delete:
- `frontend/src/App.css`

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: set up Tailwind CSS, theme system, and TypeScript types"
```

### Task 8: Create NavBar and App shell

**Files:**
- Create: `frontend/src/components/NavBar.tsx`
- Create: `frontend/src/components/ThemeToggle.tsx`
- Rewrite: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/NavBar.tsx`**

```tsx
import type { Tab } from '../types';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'mouse', label: 'Mouse' },
  { id: 'usage', label: 'Usage' },
  { id: 'typing', label: 'Typing' },
  { id: 'settings', label: 'Settings' },
];

interface NavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  return (
    <nav className="flex items-center gap-1 px-4 h-12 border-b"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-bg)' }}>
      <span className="text-sm font-semibold mr-4 opacity-70">HeatTrace</span>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === tab.id
              ? 'text-white'
              : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--fg)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/ThemeToggle.tsx`**

```tsx
interface ThemeToggleProps {
  theme: string;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-md text-sm"
      style={{ color: 'var(--muted)' }}
      title={`Theme: ${theme}`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
```

- [ ] **Step 3: Rewrite `frontend/src/App.tsx`**

```tsx
import { useState } from 'react';
import { NavBar } from './components/NavBar';
import { Dashboard } from './components/Dashboard';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import type { Tab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { theme, setTheme } = useTheme('auto');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const renderPanel = () => {
    switch (activeTab) {
      case 'overview': return <Dashboard />;
      // Other panels will be added in later tasks
      default: return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center justify-between border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-bg)' }}>
        <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="pr-4">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>
      <main className="flex-1 overflow-auto p-6">
        {renderPanel()}
      </main>
    </div>
  );
}

export default App;
```

Wait — looking at the NavBar design from the spec, the nav and theme toggle should be in the same bar. Let me refine:

```tsx
import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { useTheme } from './hooks/useTheme';
import type { Tab } from './types';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'mouse', label: 'Mouse' },
  { id: 'usage', label: 'Usage' },
  { id: 'typing', label: 'Typing' },
  { id: 'settings', label: 'Settings' },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { theme, setTheme } = useTheme('auto');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <nav className="flex items-center justify-between px-4 h-11 border-b shrink-0"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-bg)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-wide opacity-50 uppercase">HeatTrace</span>
          <div className="flex gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-2.5 py-1 text-sm rounded-md transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--fg)',
                  opacity: activeTab === tab.id ? 1 : 0.7,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1 rounded text-sm"
          style={{ color: 'var(--muted)' }}
        >
          {theme === 'dark' ? '\u2600' : '\u263E'}
        </button>
      </nav>
      <main className="flex-1 overflow-auto p-6">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Create placeholder `Dashboard` component**

Create `frontend/src/components/Dashboard.tsx`:

```tsx
export function Dashboard() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Overview</h2>
      <p style={{ color: 'var(--muted)' }}>Dashboard will be built in the next task.</p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add navbar, theme toggle, and app shell"
```

---

## Phase 6: Frontend Dashboard & Panels

### Task 9: Build Dashboard (Overview) panel

**Files:**
- Create: `frontend/src/components/StatCard.tsx`
- Modify: `frontend/src/components/Dashboard.tsx`

- [ ] **Step 1: Create `frontend/src/components/StatCard.tsx`**

```tsx
interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

export function StatCard({ label, value, subtitle }: StatCardProps) {
  return (
    <div className="rounded-lg p-4 border"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}>
      <div className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{label}</div>
      {subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)', opacity: 0.6 }}>{subtitle}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `frontend/src/components/Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetDailySummary, GetToday } from '../../wailsjs/go/main/App';
import { StatCard } from './StatCard';
import type { DailySummary } from '../types';

export function Dashboard() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = await GetToday();
        const data = await GetDailySummary(today);
        setSummary(data);
      } catch (e) {
        console.error('Failed to load summary:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--muted)' }}>Loading...</div>;
  }

  if (!summary) {
    return <div style={{ color: 'var(--muted)' }}>No data available yet. Start monitoring to collect data.</div>;
  }

  const formatDistance = (m: number) => {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${m.toFixed(0)} m`;
  };

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Today's Overview</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Keys pressed" value={summary.total_keys.toLocaleString()} />
        <StatCard label="Mouse distance" value={formatDistance(summary.mouse_distance_meters)} />
        <StatCard label="Active time" value={formatMinutes(summary.active_minutes)} />
        <StatCard label="Mouse clicks" value={summary.mouse_click_count.toLocaleString()} />
      </div>

      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Top Keys</h3>
      <div className="grid grid-cols-5 gap-2">
        {summary.top_keys.slice(0, 10).map(k => (
          <div key={k.key} className="rounded-md p-2 text-center border"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="text-lg font-bold">{k.key === ' ' ? '␣' : k.key}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{k.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: build dashboard overview with stat cards and top keys"
```

### Task 10: Build Keyboard analysis panel

**Files:**
- Create: `frontend/src/components/KeyboardPanel.tsx`
- Create: `frontend/src/components/KeyboardHeatmap.tsx`
- Modify: `frontend/src/App.tsx` (wire up panel)

- [ ] **Step 1: Create `frontend/src/components/KeyboardPanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetKeyboardStats, GetToday } from '../../wailsjs/go/main/App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { KeyboardStats } from '../types';

export function KeyboardPanel() {
  const [stats, setStats] = useState<KeyboardStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const today = await GetToday();
        const data = await GetKeyboardStats(today, today);
        setStats(data);
      } catch (e) {
        console.error('Failed to load keyboard stats:', e);
      }
    }
    load();
  }, []);

  if (!stats) return <div style={{ color: 'var(--muted)' }}>Loading...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Keyboard Analysis</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{stats.total_keys.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Total keys</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{stats.filtered_keys.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Filtered</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{stats.mod_combos.length}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Key combos</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Top 20 Keys</h3>
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.key_frequency} layout="vertical">
            <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis dataKey="key" type="category" width={40} tick={{ fill: 'var(--fg)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Key Activity by Hour</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.hourly_keys}>
            <XAxis dataKey="hour" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/KeyboardHeatmap.tsx`**

```tsx
import { useEffect, useRef } from 'react';

interface KeyboardHeatmapProps {
  keys: { key: string; count: number; value: number }[];
}

// Standard keyboard layout rows
const keyboardRows = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  ['Ctrl', 'Alt', 'Space', 'Alt', 'Ctrl'],
];

export function KeyboardHeatmap({ keys }: KeyboardHeatmapProps) {
  const keyMap = new Map(keys.map(k => [k.key.toLowerCase(), k.value]));

  const getColor = (value: number | undefined) => {
    if (value === undefined || value === 0) return 'var(--card-bg)';
    const intensity = Math.min(value, 1);
    const r = Math.round(59 + (239 - 59) * intensity);
    const g = Math.round(130 + (68 - 130) * intensity);
    const b = Math.round(246 + (68 - 246) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
      {keyboardRows.map((row, ri) => (
        <div key={ri} className="flex gap-1 mb-1 justify-center">
          {row.map(key => {
            const value = keyMap.get(key.toLowerCase());
            return (
              <div
                key={key}
                className="rounded text-center text-xs py-1.5 border transition-colors"
                style={{
                  minWidth: key === 'Space' ? 200 : key === 'Tab' || key === 'Caps' || key === 'Enter' || key === 'Shift' ? 60 : 36,
                  backgroundColor: getColor(value),
                  borderColor: 'var(--border)',
                  color: value && value > 0.5 ? '#fff' : 'var(--fg)',
                }}
                title={`${key}: ${value !== undefined ? Math.round(value * 100) : 0}%`}
              >
                {key}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update `KeyboardPanel.tsx` to include keyboard heatmap**

Add import and render `<KeyboardHeatmap keys={stats.key_frequency} />` below the top keys chart.

- [ ] **Step 4: Wire KeyboardPanel into App.tsx**

Update the `renderPanel` switch in `App.tsx`:
```tsx
case 'keyboard': return <KeyboardPanel />;
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/KeyboardPanel.tsx frontend/src/components/KeyboardHeatmap.tsx frontend/src/App.tsx
git commit -m "feat: build keyboard analysis panel with charts and heatmap"
```

### Task 11: Build Mouse analysis panel

**Files:**
- Create: `frontend/src/components/MousePanel.tsx`
- Create: `frontend/src/components/MouseHeatmap.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/MousePanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetMouseStats, GetToday } from '../../wailsjs/go/main/App';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { MouseStats } from '../types';

export function MousePanel() {
  const [stats, setStats] = useState<MouseStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const today = await GetToday();
        const data = await GetMouseStats(today, today);
        setStats(data);
      } catch (e) {
        console.error('Failed to load mouse stats:', e);
      }
    }
    load();
  }, []);

  if (!stats) return <div style={{ color: 'var(--muted)' }}>Loading...</div>;

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Mouse Analysis</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{stats.total_clicks.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Total clicks</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{formatDistance(stats.total_distance_meters)}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Distance moved</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{stats.left_clicks.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Left clicks</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{stats.right_clicks.toLocaleString()}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Right clicks</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Daily Mouse Distance</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stats.daily_distance}>
            <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <Line type="monotone" dataKey="distance" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/MouseHeatmap.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import h337 from 'heatmap.js';

interface MouseHeatmapProps {
  points: { x: number; y: number }[];
  width: number;
  height: number;
}

export function MouseHeatmap({ points, width, height }: MouseHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    const heatmapInstance = h337.create({
      container: containerRef.current,
      radius: 20,
      maxOpacity: 0.6,
      blur: 0.8,
    });

    const dataPoints = points.map(p => ({
      x: Math.round(p.x * width / 1920),
      y: Math.round(p.y * height / 1080),
      value: 1,
    }));

    heatmapInstance.setData({
      max: Math.max(...dataPoints.map(() => 1)),
      min: 0,
      data: dataPoints,
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [points, width, height]);

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div ref={containerRef} style={{ width, height, position: 'relative' }} />
    </div>
  );
}
```

- [ ] **Step 3: Wire MousePanel into App.tsx**

```tsx
case 'mouse': return <MousePanel />;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: build mouse analysis panel with heatmap and charts"
```

### Task 12: Build Usage and Typing panels

**Files:**
- Create: `frontend/src/components/UsagePanel.tsx`
- Create: `frontend/src/components/TypingPanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/UsagePanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetUsageTime, GetToday } from '../../wailsjs/go/main/App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { UsageTime } from '../types';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function UsagePanel() {
  const [data, setData] = useState<UsageTime | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const today = await GetToday();
        const result = await GetUsageTime(today, today);
        setData(result);
      } catch (e) {
        console.error('Failed to load usage data:', e);
      }
    }
    load();
  }, []);

  if (!data) return <div style={{ color: 'var(--muted)' }}>Loading...</div>;

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Usage Time</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{formatMinutes(data.total_minutes)}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Total active time</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{data.app_usage.length}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Active apps</div>
        </div>
      </div>

      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Daily Usage</h3>
      <div className="h-48 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.daily_usage}>
            <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
              formatter={(value: number) => formatMinutes(value)}
            />
            <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.app_usage.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>App Usage</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.app_usage}
                  dataKey="minutes"
                  nameKey="app"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ app, percent }) => `${app} (${(percent * 100).toFixed(0)}%)`}
                >
                  {data.app_usage.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
                  formatter={(value: number) => formatMinutes(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/TypingPanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetTypingSpeed, GetToday } from '../../wailsjs/go/main/App';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { TypingSpeed } from '../types';

export function TypingPanel() {
  const [data, setData] = useState<TypingSpeed | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const today = await GetToday();
        const result = await GetTypingSpeed(today, today);
        setData(result);
      } catch (e) {
        console.error('Failed to load typing speed:', e);
      }
    }
    load();
  }, []);

  if (!data) return <div style={{ color: 'var(--muted)' }}>Loading...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Typing Speed</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{data.average_cpm.toFixed(0)}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg CPM</div>
        </div>
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold">{data.average_wpm.toFixed(0)}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Avg WPM</div>
        </div>
      </div>

      {data.daily_speed.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Daily WPM Trend</h3>
          <div className="h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_speed}>
                <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                <Line type="monotone" dataKey="wpm" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {data.hourly_speed.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted)' }}>Speed by Hour</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourly_speed}>
                <XAxis dataKey="hour" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                <Area type="monotone" dataKey="cpm" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire panels into App.tsx**

```tsx
case 'usage': return <UsagePanel />;
case 'typing': return <TypingPanel />;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: build usage time and typing speed panels"
```

### Task 13: Build Settings panel

**Files:**
- Create: `frontend/src/components/SettingsPanel.tsx`
- Create: `frontend/src/components/DateRangePicker.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/SettingsPanel.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetConfig, SaveConfig } from '../../wailsjs/go/main/App';
import type { AppConfig } from '../types';

export function SettingsPanel() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const cfg = await GetConfig();
        setConfig(cfg);
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    try {
      await SaveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  };

  if (!config) return <div style={{ color: 'var(--muted)' }}>Loading...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Settings</h2>

      <div className="space-y-4 max-w-md">
        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <label className="flex items-center justify-between">
            <span className="text-sm">Enable Monitoring</span>
            <input
              type="checkbox"
              checked={config.monitor_enabled}
              onChange={e => setConfig({ ...config, monitor_enabled: e.target.checked })}
              className="w-4 h-4"
            />
          </label>
        </div>

        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <label className="block">
            <span className="text-sm">Mouse sample interval (ms)</span>
            <input
              type="number"
              value={config.mouse_sample_interval_ms}
              onChange={e => setConfig({ ...config, mouse_sample_interval_ms: parseInt(e.target.value) || 100 })}
              className="mt-1 block w-full rounded-md px-3 py-1.5 text-sm border"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </label>
        </div>

        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <label className="block">
            <span className="text-sm">Data retention (days)</span>
            <input
              type="number"
              value={config.data_retention_days}
              onChange={e => setConfig({ ...config, data_retention_days: parseInt(e.target.value) || 90 })}
              className="mt-1 block w-full rounded-md px-3 py-1.5 text-sm border"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </label>
        </div>

        <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <label className="block">
            <span className="text-sm">Blacklisted apps (comma-separated)</span>
            <textarea
              value={config.blacklisted_apps.join(', ')}
              onChange={e => setConfig({ ...config, blacklisted_apps: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              rows={3}
              className="mt-1 block w-full rounded-md px-3 py-1.5 text-sm border"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-md text-sm text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire SettingsPanel into App.tsx**

```tsx
case 'settings': return <SettingsPanel />;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: build settings panel with config management"
```

---

## Phase 7: Cleanup & Build

### Task 14: Clean up boilerplate and verify build

**Files:**
- Delete: `frontend/src/App.css` (already done in Task 7)
- Modify: `build/darwin/Info.plist` (set LSUIElement for tray-only mode)

- [ ] **Step 1: Verify the build compiles**

Run:
```bash
cd /Users/liooooo/Documents/gowork/HeatTrace
go build ./...
```

- [ ] **Step 2: Install frontend deps and verify frontend builds**

Run:
```bash
cd frontend
npm install
npm run build
```

- [ ] **Step 3: Build with Wails**

Run:
```bash
cd /Users/liooooo/Documents/gowork/HeatTrace
wails build
```

- [ ] **Step 4: Fix any build errors**

Iterate on compilation issues until clean build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: clean up boilerplate and verify build"
```

### Task 15: Final integration test

- [ ] **Step 1: Run `wails dev` and verify the app launches**

Run:
```bash
wails dev
```

- [ ] **Step 2: Verify monitoring starts on app launch**

Check that data files appear in the data directory after interacting with the keyboard/mouse.

- [ ] **Step 3: Verify dashboard loads with data**

Open the main window and confirm the Overview tab shows collected data.

- [ ] **Step 4: Verify all tabs render correctly**

Click through each tab (Overview, Keyboard, Mouse, Usage, Typing, Settings) and confirm no errors.

- [ ] **Step 5: Verify theme toggle works**

Click the theme toggle and confirm dark/light mode switches.

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: HeatTrace v1 complete - cross-platform input monitor with analytics"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Cross-platform (macOS/Windows/Linux) | Tasks 3-6 (gohook/robotgo), Task 6 (Wails config) |
| Keyboard monitoring + storage | Tasks 1, 3, 4 |
| Mouse monitoring + storage | Tasks 1, 3 |
| JSON file storage (daily) | Task 1 |
| Sensitive filtering | Task 4 |
| Key frequency analysis | Task 5, 10 |
| Mouse heatmap | Task 5, 11 |
| Usage time tracking | Task 5, 12 |
| Typing speed analysis | Task 5, 12 |
| App usage time breakdown | Task 5, 12 |
| Modern UI (Tailwind) | Task 7, 8 |
| Dark/light theme | Task 7, 8 |
| System tray | Task 6 |
| Date range filtering | Task 13 |
| Settings page | Task 13 |
| Compact binary | Wails (inherent) |
