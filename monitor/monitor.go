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
	mouseMoveChan   chan storage.MouseMove
	mouseClickChan  chan storage.MouseClick
	stopChan        chan struct{}
	wg              sync.WaitGroup
	running         bool
	mu              sync.Mutex
	accessErr       string
	eventCount      int64 // atomic counter for test verification
}

func New(store storage.Store, f *filter.SensitiveFilter) *Monitor {
	return &Monitor{
		store:          store,
		filter:         f,
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
	if !CheckAccessibility() {
		m.accessErr = "accessibility"
		return fmt.Errorf("accessibility permission required")
	}
	m.accessErr = ""
	m.running = true
	atomic.StoreInt64(&m.eventCount, 0)
	m.stopChan = make(chan struct{})

	m.wg.Add(3)
	go m.writeLoop()
	go m.startKeyboardListener()
	go m.startMouseSampler()

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
		case ev := <-m.mouseMoveChan:
			date := dateFromTimestamp(ev.Timestamp)
			_ = m.store.SaveMouseMove(date, ev)
			atomic.AddInt64(&m.eventCount, 1)
		case ev := <-m.mouseClickChan:
			date := dateFromTimestamp(ev.Timestamp)
			_ = m.store.SaveMouseClick(date, ev)
			atomic.AddInt64(&m.eventCount, 1)
		}
	}
}

func dateFromTimestamp(ts int64) string {
	return time.UnixMilli(ts).Format("2006-01-02")
}
