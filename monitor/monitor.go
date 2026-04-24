package monitor

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"
	"HeatTrace/filter"
	"HeatTrace/storage"
)

type Monitor struct {
	store           storage.Store
	filter          *filter.SensitiveFilter
	keyChan         chan storage.KeyEvent
	mouseClickChan  chan storage.MouseClick
	stopChan        chan struct{}
	dataChanged     chan struct{} // signal when data is saved
	wg              sync.WaitGroup
	running         bool
	mu              sync.Mutex
	accessErr       string
	eventCount      int64 // total events (for test verification)
	keyCount        int64 // keyboard events only
	mouseClickCount int64 // mouse click events only
	lastKeyEvent    LastKeyEvent
	heatmapCounts   map[string]int // in-memory heatmap key counts
	heatmapMax      int            // max count for normalization
}

type LastKeyEvent struct {
	Key       string   `json:"key"`
	Keychar   int32    `json:"keychar"`
	Rawcode   uint16   `json:"rawcode"`
	Mask      uint16   `json:"mask"`
	Modifiers []string `json:"modifiers"`
}

func New(store storage.Store, f *filter.SensitiveFilter) *Monitor {
	return &Monitor{
		store:          store,
		filter:         f,
		keyChan:        make(chan storage.KeyEvent, 1000),
		mouseClickChan: make(chan storage.MouseClick, 1000),
		stopChan:       make(chan struct{}),
		dataChanged:    make(chan struct{}, 1),
		heatmapCounts:  make(map[string]int),
	}
}

// DataChanged returns a channel that receives a signal when new data is saved.
func (m *Monitor) DataChanged() <-chan struct{} {
	return m.dataChanged
}

func (m *Monitor) Start() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.running {
		return fmt.Errorf("monitor already running")
	}
	if !CheckAccessibility() {
		m.accessErr = "accessibility"
		return fmt.Errorf("accessibility permission required")
	}
	m.accessErr = ""
	m.running = true
	atomic.StoreInt64(&m.eventCount, 0)
	m.stopChan = make(chan struct{})

	m.wg.Add(2)
	go m.writeLoop()
	go m.startKeyboardListener()

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

func (m *Monitor) AccessError() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.accessErr
}

func (m *Monitor) SetAccessError(err string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.accessErr = err
}

// EventCount returns the total number of events processed since start.
func (m *Monitor) EventCount() int64 {
	return atomic.LoadInt64(&m.eventCount)
}

// KeyCount returns the number of keyboard events processed.
func (m *Monitor) KeyCount() int64 {
	return atomic.LoadInt64(&m.keyCount)
}

// MouseClickCount returns the number of mouse click events processed.
func (m *Monitor) MouseClickCount() int64 {
	return atomic.LoadInt64(&m.mouseClickCount)
}

// LastKeyEvent returns the most recent keyboard event details.
func (m *Monitor) LastKeyEvent() LastKeyEvent {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.lastKeyEvent
}

// shiftedToBase normalizes shifted chars to base keys for heatmap layout.
var shiftedToBase = map[string]string{
	"!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
	"^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
	"_": "-", "+": "=", "~": "`",
	"{": "[", "}": "]", "|": "\\",
	":": ";", "\"": "'",
	"<": ",", ">": ".", "?": "/",
}

// IncrementHeatmapKey increments a key's count in the in-memory heatmap.
func (m *Monitor) IncrementHeatmapKey(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if base, ok := shiftedToBase[key]; ok {
		key = base
	}
	m.heatmapCounts[key]++
	if m.heatmapCounts[key] > m.heatmapMax {
		m.heatmapMax = m.heatmapCounts[key]
	}
}

// GetHeatmapCounts returns the current in-memory heatmap counts.
func (m *Monitor) GetHeatmapCounts() (map[string]int, int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := make(map[string]int, len(m.heatmapCounts))
	for k, v := range m.heatmapCounts {
		cp[k] = v
	}
	return cp, m.heatmapMax
}

// ResetHeatmapCounts clears the in-memory heatmap (e.g. on date change).
func (m *Monitor) ResetHeatmapCounts() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.heatmapCounts = make(map[string]int)
	m.heatmapMax = 0
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
			atomic.AddInt64(&m.eventCount, 1)
			atomic.AddInt64(&m.keyCount, 1)
				if !ev.Filtered && ev.Key != "" {
					m.IncrementHeatmapKey(ev.Key)
				}
		case ev := <-m.mouseClickChan:
			date := dateFromTimestamp(ev.Timestamp)
			_ = m.store.SaveMouseClick(date, ev)
			atomic.AddInt64(&m.eventCount, 1)
			atomic.AddInt64(&m.mouseClickCount, 1)
			m.signalDataChanged()
		}
	}
}

func (m *Monitor) signalDataChanged() {
	select {
	case m.dataChanged <- struct{}{}:
	default: // already pending, skip
	}
}

func dateFromTimestamp(ts int64) string {
	return time.UnixMilli(ts).Format("2006-01-02")
}
