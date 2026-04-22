package storage

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
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

func NewJSONStore(dataDir string) (*JSONStore, error) {
	if dataDir == "" {
		dataDir = config.DataDir()
	}
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
	go s.compressOldData()
	return s, nil
}

func (s *JSONStore) Stop() {
	close(s.stopCh)
	s.flushAll()
}

// FlushAll synchronously writes all dirty data to disk.
func (s *JSONStore) FlushAll() {
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

func (s *JSONStore) filePathGz(date string) string {
	return filepath.Join(s.dataDir, date+".json.gz")
}

// readFile reads a date's data, trying .json.gz first then .json.
func (s *JSONStore) readFile(date string) ([]byte, error) {
	// Try gzip first
	if data, err := os.ReadFile(s.filePathGz(date)); err == nil {
		return gunzip(data)
	}
	// Fall back to plain json
	return os.ReadFile(s.filePath(date))
}

func gunzip(data []byte) ([]byte, error) {
	r, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer r.Close()
	return io.ReadAll(r)
}

func gzipData(data []byte) ([]byte, error) {
	var buf bytes.Buffer
	w := gzip.NewWriter(&buf)
	if _, err := w.Write(data); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// compressOldData gzips all .json files older than today at startup.
func (s *JSONStore) compressOldData() {
	today := time.Now().Format("2006-01-02")
	entries, err := os.ReadDir(s.dataDir)
	if err != nil {
		return
	}
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".json") || e.IsDir() {
			continue
		}
		date := strings.TrimSuffix(name, ".json")
		if date >= today {
			continue // keep today's file uncompressed
		}
		plain := filepath.Join(s.dataDir, name)
		data, err := os.ReadFile(plain)
		if err != nil {
			continue
		}
		gzData, err := gzipData(data)
		if err != nil {
			continue
		}
		gzPath := s.filePathGz(date)
		if err := os.WriteFile(gzPath, gzData, 0644); err != nil {
			continue
		}
		os.Remove(plain)
	}
}

func (s *JSONStore) loadOrCreate(date string) (*DayData, error) {
	if cached, ok := s.dayCache[date]; ok {
		return cached, nil
	}
	data, err := s.readFile(date)
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
	dateSet := make(map[string]struct{})
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() {
			continue
		}
		if strings.HasSuffix(name, ".json.gz") {
			dateSet[strings.TrimSuffix(name, ".json.gz")] = struct{}{}
		} else if strings.HasSuffix(name, ".json") {
			dateSet[strings.TrimSuffix(name, ".json")] = struct{}{}
		}
	}
	dates := make([]string, 0, len(dateSet))
	for d := range dateSet {
		dates = append(dates, d)
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
			os.Remove(s.filePathGz(d))
			s.mu.Lock()
			delete(s.dayCache, d)
			delete(s.dirty, d)
			s.mu.Unlock()
		}
	}
	return nil
}
