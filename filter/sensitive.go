package filter

import (
	"strings"
	"sync"
	"HeatTrace/storage"
)

type SensitiveFilter struct {
	mu              sync.RWMutex
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
	f.mu.RLock()
	defer f.mu.RUnlock()
	if !f.enabled {
		return false
	}
	if keyEvent.App != "" && f.blacklistedApps[strings.ToLower(keyEvent.App)] {
		return true
	}
	return false
}

func (f *SensitiveFilter) SetBlacklist(apps []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.blacklistedApps = make(map[string]bool)
	for _, app := range apps {
		f.blacklistedApps[strings.ToLower(app)] = true
	}
}

func (f *SensitiveFilter) SetEnabled(enabled bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.enabled = enabled
}
