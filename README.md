<div align="center">

<img src="build/appicon.png" width="80" />

# HeatTrace

**Desktop activity tracker for keyboard & mouse**

[![Build](https://github.com/liooooo29/HeatTrace/actions/workflows/build.yml/badge.svg)](https://github.com/liooooo29/HeatTrace/actions/workflows/build.yml)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)

Keystrokes, mouse distance, typing speed — all tracked locally on your machine.

</div>

---

## Features

- **Real-time tracking** — keystrokes, mouse movement & clicks, with live dashboard
- **Typing ECG** — heartbeat-style visualization of your coding rhythm
- **Keyboard heatmap** — see which keys you hit most, per-layout
- **Weekly report** — activity trends, top apps, shareable cards
- **Custom themes** — 13 dark themes + accent color picker
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
