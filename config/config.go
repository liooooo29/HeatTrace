package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

type Config struct {
	MonitorEnabled      bool     `json:"monitor_enabled"`
	MouseSampleInterval int      `json:"mouse_sample_interval_ms"`
	BlacklistedApps     []string `json:"blacklisted_apps"`
	Theme               string   `json:"theme"`
	DataRetentionDays   int      `json:"data_retention_days"`
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
	switch runtime.GOOS {
	case "darwin":
		return filepath.Join(home, "Library", "Application Support", "HeatTrace")
	case "windows":
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
