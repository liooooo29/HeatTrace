package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"HeatTrace/config"
)

type JSONStore struct {
	mu       sync.RWMutex
	dataDir  string
	dayCache map[string]*DayData
	dirty    map[string]bool
	stopCh   chan struct{}
}

func NewJSONStore() (*JSONStore, error) {
	dataDir := filepath.Join(config.DataDir(), "data")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}
	s := &JSONStore{
		dataDir:  dataDir,
		dayCache: make(map[string]*DayData),
		dirty:    make(map[string]bool),
		stopCh:   make(chan struct{}),
	}
	go s.flushLoop()
	return s, nil
}

func (s *JSONStore) Stop() {
	close(s.stopCh)
	s.flushAll()
}

func (s *JSONStore) flushLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.flushAll()
		}
	}
}

func (s *JSONStore) flushAll() {
	s.mu.RLock()
	var dates []string
	for d := range s.dirty {
		dates = append(dates, d)
	}
	s.mu.RUnlock()

	for _, d := range dates {
		s.flush(d)
	}
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
			day := &DayData{
				Date:     date,
				Keyboard: []KeyEvent{},
				Mouse:    MouseData{Moves: []MouseMove{}, Clicks: []MouseClick{}},
			}
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
	s.mu.RLock()
	day, ok := s.dayCache[date]
	s.mu.RUnlock()
	if !ok {
		return nil
	}
	data, err := json.Marshal(day)
	if err != nil {
		return err
	}
	if err := os.WriteFile(s.filePath(date), data, 0644); err != nil {
		return err
	}
	s.mu.Lock()
	delete(s.dirty, date)
	s.mu.Unlock()
	return nil
}

func (s *JSONStore) markDirty(date string) {
	s.mu.Lock()
	s.dirty[date] = true
	s.mu.Unlock()
}

func (s *JSONStore) SaveKeyEvent(date string, event KeyEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.loadOrCreate(date)
	if err != nil {
		return err
	}
	day.Keyboard = append(day.Keyboard, event)
	s.dirty[date] = true
	return nil
}

func (s *JSONStore) SaveMouseMove(date string, event MouseMove) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.loadOrCreate(date)
	if err != nil {
		return err
	}
	day.Mouse.Moves = append(day.Mouse.Moves, event)
	s.dirty[date] = true
	return nil
}

func (s *JSONStore) SaveMouseClick(date string, event MouseClick) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, err := s.loadOrCreate(date)
	if err != nil {
		return err
	}
	day.Mouse.Clicks = append(day.Mouse.Clicks, event)
	s.dirty[date] = true
	return nil
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
	dates, err := s.ListDates()
	if err != nil {
		return err
	}
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	for _, d := range dates {
		if d < cutoff {
			os.Remove(s.filePath(d))
			s.mu.Lock()
			delete(s.dayCache, d)
			delete(s.dirty, d)
			s.mu.Unlock()
		}
	}
	return nil
}
