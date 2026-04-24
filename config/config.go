package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

type Config struct {
	MonitorEnabled    bool     `json:"monitor_enabled"`
	BlacklistedApps   []string `json:"blacklisted_apps"`
	Theme             string   `json:"theme"`
	DataRetentionDays int      `json:"data_retention_days"`
	DataDir           string   `json:"data_dir,omitempty"` // empty = default path
}

func DefaultConfig() *Config {
	return &Config{
		MonitorEnabled:    true,
		BlacklistedApps:   []string{},
		Theme:             "auto",
		DataRetentionDays: 90,
		DataDir:           "",
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
		dataHome := os.Getenv("XDG_DATA_HOME")
		if dataHome == "" {
			dataHome = filepath.Join(home, ".local", "share")
		}
		return filepath.Join(dataHome, "heattrace")
	}
}

func ConfigDir() string {
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "darwin", "windows":
		return DataDir()
	default:
		configHome := os.Getenv("XDG_CONFIG_HOME")
		if configHome == "" {
			configHome = filepath.Join(home, ".config")
		}
		return filepath.Join(configHome, "heattrace")
	}
}

func ConfigPath() string {
	return filepath.Join(ConfigDir(), "config.json")
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

func (cfg *Config) EffectiveDataDir() string {
	if cfg.DataDir != "" {
		return cfg.DataDir
	}
	return DataDir()
}

func Save(cfg *Config) error {
	dir := ConfigDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigPath(), data, 0644)
}
