package updater

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
)

const repoOwner = "liooooo29"
const repoName = "HeatTrace"

type UpdateInfo struct {
	Available   bool   `json:"available"`
	Version     string `json:"version"`
	Notes       string `json:"notes"`
	DownloadURL string `json:"downloadUrl"`
	AssetName   string `json:"assetName"`
}

type ghRelease struct {
	TagName string `json:"tag_name"`
	Body    string `json:"body"`
	Assets  []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

func CheckForUpdate(currentVersion string) *UpdateInfo {
	cur, err := semver.NewVersion(currentVersion)
	if err != nil {
		return &UpdateInfo{}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", repoOwner, repoName)
	resp, err := client.Get(url)
	if err != nil {
		return &UpdateInfo{}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &UpdateInfo{}
	}

	var release ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return &UpdateInfo{}
	}

	latest, err := semver.NewVersion(release.TagName)
	if err != nil {
		return &UpdateInfo{}
	}

	if !latest.GreaterThan(cur) {
		return &UpdateInfo{Version: release.TagName}
	}

	assetName, downloadURL := findAsset(release.Assets)

	return &UpdateInfo{
		Available:   true,
		Version:     release.TagName,
		Notes:       release.Body,
		DownloadURL: downloadURL,
		AssetName:   assetName,
	}
}

func findAsset(assets []struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}) (string, string) {
	goos := runtime.GOOS

	for _, a := range assets {
		name := strings.ToLower(a.Name)
		switch goos {
		case "linux":
			if strings.HasSuffix(name, ".appimage") && !strings.Contains(name, "22.04") {
				return a.Name, a.BrowserDownloadURL
			}
		case "darwin":
			if strings.HasSuffix(name, ".dmg") {
				return a.Name, a.BrowserDownloadURL
			}
		case "windows":
			if strings.HasSuffix(name, ".zip") {
				return a.Name, a.BrowserDownloadURL
			}
		}
	}

	// Fallback: return release page
	return "", fmt.Sprintf("https://github.com/%s/%s/releases/latest", repoOwner, repoName)
}
