<div align="center">

<img src="build/appicon.png" width="80" />

# HeatTrace

**Desktop activity tracker for keyboard & mouse**

[![Build](https://github.com/liooooo29/HeatTrace/actions/workflows/build.yml/badge.svg)](https://github.com/liooooo29/HeatTrace/actions/workflows/build.yml)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)

Keystrokes, mouse distance, typing speed — all tracked locally on your machine.

</div>

---

## Screenshots

<p align="center">
  <img src="screenshots/dashboard.png" width="280" />
  <img src="screenshots/weekly-report.png" width="280" />
  <img src="screenshots/settings.png" width="280" />
</p>

## Features

- **Real-time dashboard** — live keystrokes, WPM, active time, mouse clicks with auto-refresh
- **Typing ECG** — heartbeat-style visualization of your coding rhythm (1-min granularity)
- **Keyboard heatmap** — visual key frequency per layout
- **Weekly report** — activity overview, daily/hourly trends, typing style analysis, shareable cards
- **Top Apps** — track which apps consume your time
- **13 dark themes** — built-in theme gallery + accent color picker
- **Setup wizard** — guided accessibility permission on first launch
- **Data retention** — auto-cleanup old data, configurable retention period
- **100% local** — no cloud, no account, data stays on your disk

## Install

### Download

Grab the latest release for your platform from [Releases](https://github.com/liooooo29/HeatTrace/releases).

### Build from source

```bash
# Prerequisites: Go 1.21+, Node.js, Wails CLI
wails build
```

## Tech Stack

| Layer    | Stack                          |
| -------- | ------------------------------ |
| Backend  | Go + [Wails v2](https://wails.io) |
| Frontend | React + TypeScript + Tailwind  |
| Charts   | Recharts                       |
| Hooks    | [gohook](https://github.com/robotn/gohook) + [robotgo](https://github.com/go-vgo/robotgo) |
| Storage  | Local JSON (gzip compressed)   |

## License

MIT
