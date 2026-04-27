# HeatTrace Feature Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new features to HeatTrace: Weekly Report, Hand Heatmap, AI Insights Summary, and Typing Rhythm visualization.

**Architecture:** Backend adds 3 new analytics functions (weekly report, typing rhythm, hand heatmap is frontend-only). Frontend adds 4 new components. Weekly report entry is in the Dashboard title area (no new tab). Image export uses `html-to-image` + Go `SaveFileDialog`.

**Tech Stack:** Go (analytics), React + TypeScript (frontend), recharts (charts), html-to-image (export), Tailwind CSS

---

## Task 1: Backend — Typing Rhythm Analytics

**Files:**
- Create: `analytics/typing_rhythm.go`
- Modify: `app.go` (add `GetTypingRhythm` method)

- [ ] **Step 1: Create `analytics/typing_rhythm.go`**

```go
package analytics

import (
	"fmt"
	"HeatTrace/storage"
)

type RhythmPoint struct {
	Time string  `json:"time"`  // "09:00", "09:05" etc
	CPM  float64 `json:"cpm"`
	Keys int     `json:"keys"`
}

func ComputeTypingRhythm(days []storage.DayData) []RhythmPoint {
	// 5-minute windows per day
	type window struct {
		keys int
		date string
		hour int
		min  int // 0, 5, 10, ... 55
	}
	windows := make(map[string]*window) // key: "date HH:MM"

	for _, day := range days {
		for _, k := range day.Keyboard {
			if k.Filtered {
				continue
			}
			ts := k.Timestamp
			hour := hourFromTimestamp(ts)
			min5 := int((ts % 3600000) / 300000) * 5 // 0-55
			key := fmt.Sprintf("%s %02d:%02d", day.Date, hour, min5)
			if _, ok := windows[key]; !ok {
				windows[key] = &window{date: day.Date, hour: hour, min: min5}
			}
			windows[key].keys++
		}
	}

	var result []RhythmPoint
	for key, w := range windows {
		_ = key
		cpm := float64(w.keys) / 5.0
		result = append(result, RhythmPoint{
			Time: fmt.Sprintf("%s %02d:%02d", w.date, w.hour, w.min),
			CPM:  cpm,
			Keys: w.keys,
		})
	}

	// Sort by time
	sortRhythmPoints(result)
	return result
}

func sortRhythmPoints(pts []RhythmPoint) {
	// Simple sort by Time string (ISO format sorts lexicographically)
	for i := 1; i < len(pts); i++ {
		for j := i; j > 0 && pts[j].Time < pts[j-1].Time; j-- {
			pts[j], pts[j-1] = pts[j-1], pts[j]
		}
	}
}
```

- [ ] **Step 2: Add `GetTypingRhythm` to `app.go`**

Add after the existing `GetHeatmapData` method:

```go
func (a *App) GetTypingRhythm(startDate, endDate string) ([]analytics.RhythmPoint, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}
	return analytics.ComputeTypingRhythm(days), nil
}
```

- [ ] **Step 3: Build to verify Go compilation**

Run: `wails build -skipbindings 2>&1 | tail -5`
Expected: "Built ... HeatTrace" success message

---

## Task 2: Backend — Weekly Report Analytics

**Files:**
- Create: `analytics/weekly_report.go`
- Modify: `app.go` (add `GetWeeklyReport` and `SaveReportImage` methods)

- [ ] **Step 1: Create `analytics/weekly_report.go`**

```go
package analytics

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"HeatTrace/storage"
)

type WeeklyReport struct {
	StartDate     string           `json:"start_date"`
	EndDate       string           `json:"end_date"`
	TotalKeys     int              `json:"total_keys"`
	TotalClicks   int              `json:"total_clicks"`
	TotalDistance float64          `json:"total_distance_meters"`
	ActiveMinutes int              `json:"active_minutes"`
	AvgWPM        float64          `json:"avg_wpm"`
	AppCount      int              `json:"app_count"`
	PrevWeek      *WeekComparison  `json:"prev_week"`
	DailyGrid     []DailyGridCell  `json:"daily_grid"`
	Insights      []Insight        `json:"insights"`
	Summary       string           `json:"summary"`
	TopApps       []AppUsagePoint  `json:"top_apps"`
}

type WeekComparison struct {
	KeysDelta     float64 `json:"keys_delta"`
	ClicksDelta   float64 `json:"clicks_delta"`
	DistanceDelta float64 `json:"distance_delta"`
	ActiveDelta   float64 `json:"active_delta"`
	WPMDelta      float64 `json:"wpm_delta"`
}

type DailyGridCell struct {
	Date  string  `json:"date"`
	Hour  int     `json:"hour"`
	Keys  int     `json:"keys"`
	Value float64 `json:"value"`
}

type Insight struct {
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Color  string `json:"color"`
}

func ComputeWeeklyReport(thisWeek, prevWeek []storage.DayData) WeeklyReport {
	var report WeeklyReport

	// Date range
	if len(thisWeek) > 0 {
		report.StartDate = thisWeek[0].Date
		report.EndDate = thisWeek[len(thisWeek)-1].Date
	}

	// Aggregate this week
	keyboardStats := ComputeKeyboardStats(thisWeek)
	mouseStats := ComputeMouseStats(thisWeek)
	typingSpeed := ComputeTypingSpeed(thisWeek)
	usageTime := ComputeUsageTime(thisWeek)

	report.TotalKeys = keyboardStats.TotalKeys
	report.TotalClicks = mouseStats.TotalClicks
	report.TotalDistance = mouseStats.TotalDistance
	report.ActiveMinutes = usageTime.TotalMinutes
	report.AvgWPM = typingSpeed.AverageWPM
	report.AppCount = len(usageTime.AppUsage)

	// Top 5 apps
	sort.Slice(usageTime.AppUsage, func(i, j int) bool {
		return usageTime.AppUsage[i].Minutes > usageTime.AppUsage[j].Minutes
	})
	if len(usageTime.AppUsage) > 5 {
		report.TopApps = usageTime.AppUsage[:5]
	} else {
		report.TopApps = usageTime.AppUsage
	}

	// Daily grid (7 days x 24 hours)
	hourlyMap := make(map[string]int) // "date hour" -> count
	for _, day := range thisWeek {
		for _, k := range day.Keyboard {
			if !k.Filtered {
				h := hourFromTimestamp(k.Timestamp)
				key := fmt.Sprintf("%s %d", day.Date, h)
				hourlyMap[key]++
			}
		}
	}
	var maxHourly int
	for _, count := range hourlyMap {
		if count > maxHourly {
			maxHourly = count
		}
	}
	for _, day := range thisWeek {
		for h := 0; h < 24; h++ {
			key := fmt.Sprintf("%s %d", day.Date, h)
			count := hourlyMap[key]
			val := 0.0
			if maxHourly > 0 {
				val = float64(count) / float64(maxHourly)
			}
			report.DailyGrid = append(report.DailyGrid, DailyGridCell{
				Date:  day.Date,
				Hour:  h,
				Keys:  count,
				Value: val,
			})
		}
	}

	// Previous week comparison
	if len(prevWeek) > 0 {
		prevKB := ComputeKeyboardStats(prevWeek)
		prevMS := ComputeMouseStats(prevWeek)
		prevTS := ComputeTypingSpeed(prevWeek)
		prevUT := ComputeUsageTime(prevWeek)

		report.PrevWeek = &WeekComparison{
			KeysDelta:     pctDelta(float64(keyboardStats.TotalKeys), float64(prevKB.TotalKeys)),
			ClicksDelta:   pctDelta(float64(mouseStats.TotalClicks), float64(prevMS.TotalClicks)),
			DistanceDelta: pctDelta(mouseStats.TotalDistance, prevMS.TotalDistance),
			ActiveDelta:   pctDelta(float64(usageTime.TotalMinutes), float64(prevUT.TotalMinutes)),
			WPMDelta:      pctDelta(typingSpeed.AverageWPM, prevTS.AverageWPM),
		}
	}

	// Insights
	report.Insights = generateInsights(thisWeek, keyboardStats, mouseStats, typingSpeed, usageTime, report.PrevWeek)
	report.Summary = generateSummary(report, typingSpeed, usageTime)

	return report
}

func pctDelta(current, prev float64) float64 {
	if prev == 0 {
		return 0
	}
	return math.Round((current-prev)/prev*1000) / 10
}

func generateInsights(days []storage.DayData, kb KeyboardStats, ms MouseStats, ts TypingSpeed, ut UsageTime, comp *WeekComparison) []Insight {
	var insights []Insight

	// Peak hour
	if len(ts.HourlySpeed) > 0 {
		peakHour := 0
		peakCPM := 0.0
		for _, h := range ts.HourlySpeed {
			if h.CPM > peakCPM {
				peakCPM = h.CPM
				peakHour = h.Hour
			}
		}
		if peakCPM > 0 {
			insights = append(insights, Insight{
				Title:  "Peak Hour",
				Detail: fmt.Sprintf("Your most productive hour was %d:00", peakHour),
				Color:  "accent",
			})
		}
	}

	// Top combo
	if len(kb.ModCombo) > 0 {
		insights = append(insights, Insight{
			Title:  "Top Shortcut",
			Detail: fmt.Sprintf("Most used shortcut: %s (%d times)", kb.ModCombo[0].Combo, kb.ModCombo[0].Count),
			Color:  "accent",
		})
	}

	// Most active day
	dayKeys := make(map[string]int)
	for _, day := range days {
		count := 0
		for _, k := range day.Keyboard {
			if !k.Filtered {
				count++
			}
		}
		dayKeys[day.Date] = count
	}
	var busiestDay string
	var busiestCount int
	for d, c := range dayKeys {
		if c > busiestCount {
			busiestCount = c
			busiestDay = d
		}
	}
	if busiestDay != "" {
		t, _ := time.Parse("2006-01-02", busiestDay)
		dow := t.Weekday().String()
		insights = append(insights, Insight{
			Title:  "Busiest Day",
			Detail: fmt.Sprintf("%s was your busiest day", dow),
			Color:  "green",
		})
	}

	// Typing speed comparison
	if comp != nil && ts.AverageWPM > 0 {
		dir := "faster"
		if comp.WPMDelta < 0 {
			dir = "slower"
		}
		insights = append(insights, Insight{
			Title:  "Typing Speed",
			Detail: fmt.Sprintf("Average %.0f WPM, %.0f%% %s than last week", ts.AverageWPM, math.Abs(comp.WPMDelta), dir),
			Color:  "green",
		})
	}

	// Distance fun fact
	if ms.TotalDistance > 0 {
		var fact string
		if ms.TotalDistance >= 1000 {
			fact = fmt.Sprintf("%.1f km", ms.TotalDistance/1000)
		} else {
			fact = fmt.Sprintf("%.0f m", ms.TotalDistance)
		}
		insights = append(insights, Insight{
			Title:  "Mouse Distance",
			Detail: fmt.Sprintf("Mouse moved %s this week", fact),
			Color:  "amber",
		})
	}

	return insights
}

func generateSummary(report WeeklyReport, ts TypingSpeed, ut UsageTime) string {
	var parts []string

	hours := float64(report.ActiveMinutes) / 60.0
	parts = append(parts, fmt.Sprintf("This week you worked for %.1f hours across %d days, pressing %s keys.",
		hours, len(report.DailyGrid)/24,
		formatNumber(report.TotalKeys)))

	if report.PrevWeek != nil {
		if report.PrevWeek.WPMDelta > 5 {
			parts = append(parts, fmt.Sprintf("Your typing speed improved %.0f%% from last week.", report.PrevWeek.WPMDelta))
		} else if report.PrevWeek.KeysDelta > 20 {
			parts = append(parts, fmt.Sprintf("Workload increased %.0f%% compared to last week.", report.PrevWeek.KeysDelta))
		}
	}

	if len(report.TopApps) > 0 {
		total := 0
		for _, a := range report.TopApps {
			total += a.Minutes
		}
		if total > 0 {
			pct := float64(report.TopApps[0].Minutes) / float64(total) * 100
			appName := cleanAppName(report.TopApps[0].App)
			parts = append(parts, fmt.Sprintf("%.0f%% of your time was spent in %s.", pct, appName))
		}
	}

	if len(parts) == 0 {
		parts = append(parts, fmt.Sprintf("You pressed %s keys this week.", formatNumber(report.TotalKeys)))
	}

	return strings.Join(parts, " ")
}

func formatNumber(n int) string {
	if n >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(n)/1000000)
	}
	if n >= 1000 {
		return fmt.Sprintf("%.1fK", float64(n)/1000)
	}
	return fmt.Sprintf("%d", n)
}

func cleanAppName(app string) string {
	// Strip common suffixes for readability
	for _, suffix := range []string{".app", ".exe"} {
		if strings.HasSuffix(app, suffix) {
			return strings.TrimSuffix(app, suffix)
		}
	}
	return app
}
```

- [ ] **Step 2: Add `GetWeeklyReport` and `SaveReportImage` to `app.go`**

Add imports for `encoding/base64` and `os` if not already present. Add after `GetTypingRhythm`:

```go
func (a *App) GetWeeklyReport() (*analytics.WeeklyReport, error) {
	now := time.Now()
	// Current week: Monday to today
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	monday := now.AddDate(0, 0, -weekday+1)
	thisStart := monday.Format("2006-01-02")
	thisEnd := now.Format("2006-01-02")
	prevStart := monday.AddDate(0, 0, -7).Format("2006-01-02")
	prevEnd := monday.AddDate(0, 0, -1).Format("2006-01-02")

	thisWeek, err := a.store.LoadDateRange(thisStart, thisEnd)
	if err != nil {
		return nil, err
	}
	prevWeek, _ := a.store.LoadDateRange(prevStart, prevEnd)

	report := analytics.ComputeWeeklyReport(thisWeek, prevWeek)
	return &report, nil
}

func (a *App) SaveReportImage(base64Data string) (string, error) {
	imgBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", err
	}
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save Weekly Report",
		Filters: []runtime.FileFilter{
			{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
		},
		DefaultFilename: fmt.Sprintf("weekly-report-%s.png", time.Now().Format("2006-01-02")),
	})
	if err != nil || savePath == "" {
		return "", err
	}
	return savePath, os.WriteFile(savePath, imgBytes, 0644)
}
```

- [ ] **Step 3: Build to verify**

Run: `wails build -skipbindings 2>&1 | tail -5`
Expected: Build success

---

## Task 3: Frontend Types and Bindings

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/wails-bindings.ts`

- [ ] **Step 1: Add types to `types/index.ts`**

Append after the existing `Tab` type:

```ts
export interface WeeklyReport {
  start_date: string;
  end_date: string;
  total_keys: number;
  total_clicks: number;
  total_distance_meters: number;
  active_minutes: number;
  avg_wpm: number;
  app_count: number;
  prev_week: WeekComparison | null;
  daily_grid: DailyGridCell[];
  insights: Insight[];
  summary: string;
  top_apps: AppUsagePoint[];
}

export interface WeekComparison {
  keys_delta: number;
  clicks_delta: number;
  distance_delta: number;
  active_delta: number;
  wpm_delta: number;
}

export interface DailyGridCell {
  date: string;
  hour: number;
  keys: number;
  value: number;
}

export interface Insight {
  title: string;
  detail: string;
  color: string;
}

export interface RhythmPoint {
  time: string;
  cpm: number;
  keys: number;
}
```

- [ ] **Step 2: Add bindings to `wails-bindings.ts`**

Append before the `BrowserOpenURL` function:

```ts
export async function GetWeeklyReport(): Promise<any> {
  const app = getApp();
  if (!app?.GetWeeklyReport) return null;
  return app.GetWeeklyReport();
}

export async function SaveReportImage(base64Data: string): Promise<string> {
  const app = getApp();
  if (!app?.SaveReportImage) return '';
  return app.SaveReportImage(base64Data);
}

export async function GetTypingRhythm(start: string, end: string): Promise<any[]> {
  const app = getApp();
  if (!app?.GetTypingRhythm) return [];
  return app.GetTypingRhythm(start, end);
}
```

- [ ] **Step 3: Build frontend to verify**

Run: `cd /Users/liooooo/Documents/gowork/HeatTrace/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

---

## Task 4: Typing Rhythm Component

**Files:**
- Create: `frontend/src/components/TypingRhythm.tsx`
- Modify: `frontend/src/components/TypingPanel.tsx` (add rhythm section)
- Modify: `frontend/src/i18n.ts` (add rhythm translation keys)

- [ ] **Step 1: Add i18n keys**

In `en` dict, after `'prod.appUsage': 'App Usage',`:
```ts
'prod.rhythm': 'Typing Rhythm',
'prod.rhythmDesc': 'Your typing cadence over time',
'prod.noRhythm': 'No rhythm data yet',
```

In `zh` dict, after `'prod.appUsage': '应用使用',`:
```ts
'prod.rhythm': '打字节奏',
'prod.rhythmDesc': '你的打字节奏随时间变化',
'prod.noRhythm': '暂无节奏数据',
```

- [ ] **Step 2: Create `TypingRhythm.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { GetTypingRhythm } from '../wails-bindings';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { RhythmPoint } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface TypingRhythmProps {
  dateRange: { start: string; end: string };
  lang: Lang;
}

export function TypingRhythm({ dateRange, lang }: TypingRhythmProps) {
  const [data, setData] = useState<RhythmPoint[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const result = await GetTypingRhythm(dateRange.start, dateRange.end);
        setData(result || []);
      } catch {
        setData([]);
      }
    }
    load();
  }, [dateRange]);

  if (data.length === 0) {
    return (
      <div className="chart-card p-8 flex items-center justify-center"
        style={{ color: 'var(--muted)', fontSize: 13, minHeight: 192 }}>
        {t('prod.noRhythm', lang)}
      </div>
    );
  }

  // Show only the latest day's data for clarity
  const lastDate = data[data.length - 1]?.time?.slice(0, 10) || '';
  const dayData = data.filter(d => d.time.startsWith(lastDate)).map(d => ({
    ...d,
    label: d.time.slice(11, 16), // "09:05"
  }));

  // Compute average for reference line
  const avgCPM = dayData.reduce((sum, d) => sum + d.cpm, 0) / dayData.length;

  return (
    <div className="chart-card">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dayData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="rhythmGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }}
              axisLine={false} tickLine={false}
              interval={Math.max(0, Math.floor(dayData.length / 8))} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }}
              axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value.toFixed(0)} CPM`, 'Speed']}
              labelFormatter={(label: string) => `Time: ${label}`} />
            {avgCPM > 0 && (
              <ReferenceLine y={avgCPM} stroke="var(--muted-2)" strokeDasharray="3 3" strokeWidth={1} />
            )}
            <Area type="monotone" dataKey="cpm" stroke="var(--accent)" strokeWidth={2}
              fill="url(#rhythmGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add TypingRhythm to TypingPanel**

In `TypingPanel.tsx`, add import:
```tsx
import { TypingRhythm } from './TypingRhythm';
```

After the app usage pie chart section (before the closing `</div>`), add:
```tsx
{typing.daily_speed.length > 0 && (
  <div className="mt-8">
    <h3 className="section-title">{t('prod.rhythm', lang)}</h3>
    <TypingRhythm dateRange={dateRange} lang={lang} />
  </div>
)}
```

- [ ] **Step 4: Build to verify**

Run: `wails build -skipbindings 2>&1 | tail -5`
Expected: Build success

---

## Task 5: Keyboard Hand Heatmap

**Files:**
- Modify: `frontend/src/components/KeyboardHeatmap.tsx` (add hand mode toggle)
- Modify: `frontend/src/i18n.ts` (add hand heatmap keys)

- [ ] **Step 1: Add i18n keys**

In `en` dict, after existing act keys:
```ts
'act.freqMode': 'Frequency',
'act.handMode': 'Hand Map',
'act.leftHand': 'Left Hand',
'act.rightHand': 'Right Hand',
```

In `zh` dict:
```ts
'act.freqMode': '频率',
'act.handMode': '手型',
'act.leftHand': '左手',
'act.rightHand': '右手',
```

- [ ] **Step 2: Rewrite `KeyboardHeatmap.tsx` with hand mode**

Add a `mode` state (`'freq' | 'hand'`), a `FINGER_MAP`, and a `HandKeyCell` that colors left keys blue and right keys amber. Keep the existing `KeyCell` for frequency mode. Add a toggle button row at the top.

Key additions to the existing file:

After the `ROWS` constant, add:
```ts
const FINGER_MAP: Record<string, 'L' | 'R'> = {
  '`': 'L', '1': 'L', '2': 'L', '3': 'L', '4': 'L', '5': 'L',
  '6': 'R', '7': 'R', '8': 'R', '9': 'R', '0': 'R', '-': 'R', '=': 'R',
  'q': 'L', 'w': 'L', 'e': 'L', 'r': 'L', 't': 'L',
  'y': 'R', 'u': 'R', 'i': 'R', 'o': 'R', 'p': 'R', '[': 'R', ']': 'R', '\\': 'R',
  'a': 'L', 's': 'L', 'd': 'L', 'f': 'L', 'g': 'L',
  'h': 'R', 'j': 'R', 'k': 'R', 'l': 'R', ';': 'R', "'": 'R',
  'z': 'L', 'x': 'L', 'c': 'L', 'v': 'L', 'b': 'L',
  'n': 'R', 'm': 'R', ',': 'R', '.': 'R', '/': 'R',
  'tab': 'L', 'caps': 'L', 'shift': 'L', 'ctrl': 'L', 'opt': 'L', 'cmd': 'L',
  'space': 'L',
  'backspace': 'R', 'enter': 'R',
};
```

In the component, add `mode` prop (default `'freq'`):
```tsx
interface KeyboardHeatmapProps {
  keys: KeyHeatPoint[];
  mode?: 'freq' | 'hand';
}
```

For hand mode, render `KeyCell` with color based on `FINGER_MAP`:
- Left hand: `color-mix(in srgb, #818CF8 ${intensity}%, transparent)` (Indigo)
- Right hand: `color-mix(in srgb, #F59E0B ${intensity}%, transparent)` (Amber)

The `ActivityPanel.tsx` already imports `KeyboardHeatmap`. Add a state for mode and a toggle before the heatmap render. In `ActivityPanel.tsx`, modify the keyboard heatmap section:

```tsx
const [heatMode, setHeatMode] = useState<'freq' | 'hand'>('freq');
// ... in render, before <KeyboardHeatmap>:
<div className="flex gap-1 mb-3">
  <button onClick={() => setHeatMode('freq')}
    className="px-3 py-1 rounded-md text-xs font-medium"
    style={{
      backgroundColor: heatMode === 'freq' ? 'var(--accent-muted)' : 'var(--surface)',
      color: heatMode === 'freq' ? 'var(--accent)' : 'var(--muted)',
    }}>
    {t('act.freqMode', lang)}
  </button>
  <button onClick={() => setHeatMode('hand')}
    className="px-3 py-1 rounded-md text-xs font-medium"
    style={{
      backgroundColor: heatMode === 'hand' ? 'var(--accent-muted)' : 'var(--surface)',
      color: heatMode === 'hand' ? 'var(--accent)' : 'var(--muted)',
    }}>
    {t('act.handMode', lang)}
  </button>
</div>
<KeyboardHeatmap keys={heatmapKeys} mode={heatMode} />
```

- [ ] **Step 3: Build to verify**

Run: `wails build -skipbindings 2>&1 | tail -5`
Expected: Build success

---

## Task 6: Weekly Report UI Component

**Files:**
- Create: `frontend/src/components/WeeklyReport.tsx`
- Create: `frontend/src/components/WeeklyHeatmap.tsx`
- Modify: `frontend/src/i18n.ts` (add report keys)

- [ ] **Step 1: Add i18n keys**

In `en` dict:
```ts
'dash.weeklyReport': 'Weekly Report',
'dash.viewReport': 'View Weekly Report',
'dash.backToDashboard': 'Back',
'report.title': 'Weekly Report',
'report.keys': 'Keys',
'report.clicks': 'Clicks',
'report.distance': 'Distance',
'report.active': 'Active',
'report.wpm': 'WPM',
'report.heatmap': 'Activity Heatmap',
'report.insights': 'Insights',
'report.summary': 'Summary',
'report.topApps': 'Top Apps',
'report.export': 'Export as Image',
'report.exporting': 'Exporting...',
'report.exported': 'Saved',
'report.noData': 'No data for this week',
'act.freqMode': 'Frequency',
'act.handMode': 'Hand Map',
```

In `zh` dict:
```ts
'dash.weeklyReport': '周报',
'dash.viewReport': '查看周报',
'dash.backToDashboard': '返回',
'report.title': '周报',
'report.keys': '按键',
'report.clicks': '点击',
'report.distance': '距离',
'report.active': '活跃',
'report.wpm': 'WPM',
'report.heatmap': '活跃度热力图',
'report.insights': '洞察',
'report.summary': '总结',
'report.topApps': '热门应用',
'report.export': '导出为图片',
'report.exporting': '导出中...',
'report.exported': '已保存',
'report.noData': '本周暂无数据',
'act.freqMode': '频率',
'act.handMode': '手型',
```

- [ ] **Step 2: Create `WeeklyHeatmap.tsx`**

```tsx
import { useMemo } from 'react';
import type { DailyGridCell } from '../types';

interface WeeklyHeatmapProps {
  grid: DailyGridCell[];
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyHeatmap({ grid }: WeeklyHeatmapProps) {
  const { cells, maxVal } = useMemo(() => {
    const cellMap = new Map<string, number>();
    let max = 0;
    for (const c of grid) {
      cellMap.set(`${c.date}_${c.hour}`, c.value);
      if (c.value > max) max = c.value;
    }
    return { cells: cellMap, maxVal: max };
  }, [grid]);

  // Group by date
  const dates = useMemo(() => {
    const seen = new Set<string>();
    return grid.filter(c => {
      if (seen.has(c.date)) return false;
      seen.add(c.date);
      return true;
    }).map(c => c.date);
  }, [grid]);

  return (
    <div className="chart-card p-4">
      <div className="flex">
        {/* Hour labels */}
        <div className="flex flex-col mr-2" style={{ width: 28 }}>
          <div style={{ height: 18 }} /> {/* spacer for DOW row */}
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex items-center justify-end pr-1"
              style={{ height: 14, fontSize: 9, color: 'var(--muted-2)', fontFamily: 'Fira Code' }}>
              {h % 6 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>
        {/* Day columns */}
        {dates.map((date, di) => {
          const dow = new Date(date + 'T00:00:00').getDay();
          const dowLabel = DOW_LABELS[dow === 0 ? 6 : dow - 1];
          return (
            <div key={date} className="flex-1">
              <div className="text-center mb-1" style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'Fira Code', height: 18 }}>
                {dowLabel}
              </div>
              <div className="flex flex-col gap-px">
                {Array.from({ length: 24 }, (_, h) => {
                  const val = cells.get(`${date}_${h}`) || 0;
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  return (
                    <div key={h}
                      style={{
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: intensity > 0
                          ? `color-mix(in srgb, var(--accent) ${Math.round(intensity * 80 + 5)}%, var(--surface))`
                          : 'var(--surface)',
                      }}
                      title={`${date} ${h}:00 — ${Math.round(val * 100)}% activity`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `WeeklyReport.tsx`**

```tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { GetWeeklyReport, SaveReportImage } from '../wails-bindings';
import { WeeklyHeatmap } from './WeeklyHeatmap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { WeeklyReport as WeeklyReportType } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface WeeklyReportProps {
  lang: Lang;
  onBack: () => void;
}

export function WeeklyReport({ lang, onBack }: WeeklyReportProps) {
  const [report, setReport] = useState<WeeklyReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await GetWeeklyReport();
        setReport(data);
      } catch (e) {
        console.error('Failed to load weekly report:', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleExport = useCallback(async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        backgroundColor: '#0C0A09',
      });
      const base64 = dataUrl.split(',')[1];
      const savedPath = await SaveReportImage(base64);
      if (savedPath) {
        setExported(true);
        setTimeout(() => setExported(false), 2000);
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
  }, []);

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`;
  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="page-title">{t('report.title', lang)}</h2>
        </div>
        <div className="grid grid-cols-5 gap-4 mb-6">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24" />)}</div>
        <div className="skeleton h-48 mb-6" />
        <div className="skeleton h-32" />
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="page-title">{t('report.title', lang)}</h2>
        </div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>{t('report.noData', lang)}</div>
      </div>
    );
  }

  const formatDelta = (d: number) => {
    if (d === 0) return null;
    const sign = d > 0 ? '+' : '';
    const color = d > 0 ? 'var(--green)' : 'var(--red)';
    return <span className="text-xs font-medium tabular-nums" style={{ color }}>{sign}{d}%</span>;
  };

  const INSIGHT_COLORS: Record<string, string> = {
    accent: 'var(--accent)',
    green: 'var(--green)',
    amber: 'var(--amber)',
  };

  return (
    <div>
      <div ref={reportRef}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div>
              <h2 className="page-title">{t('report.title', lang)}</h2>
              <p className="page-subtitle">{report.start_date} — {report.end_date}</p>
            </div>
          </div>
          <button onClick={handleExport} disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{
              backgroundColor: exported ? 'var(--green-muted)' : 'var(--accent-muted)',
              color: exported ? 'var(--green)' : 'var(--accent)',
            }}>
            {exporting ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : exported ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            )}
            {exporting ? t('report.exporting', lang) : exported ? t('report.exported', lang) : t('report.export', lang)}
          </button>
        </div>

        {/* 5 Stat Cards with deltas */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: t('report.keys', lang), value: report.total_keys.toLocaleString(), delta: report.prev_week?.keys_delta },
            { label: t('report.clicks', lang), value: report.total_clicks.toLocaleString(), delta: report.prev_week?.clicks_delta },
            { label: t('report.distance', lang), value: formatDistance(report.total_distance_meters), delta: report.prev_week?.distance_delta },
            { label: t('report.active', lang), value: formatMinutes(report.active_minutes), delta: report.prev_week?.active_delta },
            { label: t('report.wpm', lang), value: report.avg_wpm.toFixed(0), delta: report.prev_week?.wpm_delta },
          ].map((card, i) => (
            <div key={i} className="card p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))` }} />
              <div className="stat-value" style={{ fontSize: 22 }}>{card.value}</div>
              <div className="stat-label">{card.label}</div>
              {card.delta != null && card.delta !== 0 && (
                <div className="mt-1">{formatDelta(card.delta)}</div>
              )}
            </div>
          ))}
        </div>

        {/* AI Summary */}
        {report.summary && (
          <div className="mb-8">
            <h3 className="section-title">{t('report.summary', lang)}</h3>
            <div className="card p-5" style={{ borderLeft: '3px solid var(--accent)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-2)' }}>{report.summary}</p>
            </div>
          </div>
        )}

        {/* Heatmap */}
        {report.daily_grid.length > 0 && (
          <div className="mb-8">
            <h3 className="section-title">{t('report.heatmap', lang)}</h3>
            <WeeklyHeatmap grid={report.daily_grid} />
          </div>
        )}

        {/* Insights */}
        {report.insights.length > 0 && (
          <div className="mb-8">
            <h3 className="section-title">{t('report.insights', lang)}</h3>
            <div className="grid grid-cols-2 gap-3">
              {report.insights.map((ins, i) => (
                <div key={i} className="card p-4 flex gap-3">
                  <div className="w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: INSIGHT_COLORS[ins.color] || 'var(--accent)' }} />
                  <div>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>{ins.title}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{ins.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Apps */}
        {report.top_apps.length > 0 && (
          <div className="mb-8">
            <h3 className="section-title">{t('report.topApps', lang)}</h3>
            <div className="chart-card">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.top_apps} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="app" type="category" width={100}
                      tick={{ fill: 'var(--fg)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface)' }} />
                    <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                      {report.top_apps.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, transparent)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build to verify**

Run: `wails build -skipbindings 2>&1 | tail -5`
Expected: Build success

---

## Task 7: Integrate Weekly Report into Dashboard

**Files:**
- Modify: `frontend/src/components/Dashboard.tsx`

- [ ] **Step 1: Add weekly report state and entry point to Dashboard**

Add imports at top of Dashboard.tsx:
```tsx
import { WeeklyReport } from './WeeklyReport';
```

Add state after existing useState declarations:
```tsx
const [showWeekly, setShowWeekly] = useState(false);
```

After the `accessErr` setup page and `loading` skeleton checks, but before the main return, add:
```tsx
if (showWeekly) {
  return <WeeklyReport lang={lang} onBack={() => setShowWeekly(false)} />;
}
```

In the main return, modify the title section to add the weekly report button. Replace:
```tsx
<h2 className="page-title">{t('dash.title', lang)}</h2>
<p className="page-subtitle">{t('dash.subtitle', lang)}</p>
```
With:
```tsx
<div className="flex items-center justify-between">
  <div>
    <h2 className="page-title">{t('dash.title', lang)}</h2>
    <p className="page-subtitle">{t('dash.subtitle', lang)}</p>
  </div>
  <button onClick={() => setShowWeekly(true)}
    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
    style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    {t('dash.weeklyReport', lang)}
  </button>
</div>
```

- [ ] **Step 2: Build final**

Run: `wails build -skipbindings 2>&1 | tail -5`
Expected: Build success

---

## Task 8: Install html-to-image

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install dependency**

Run: `cd /Users/liooooo/Documents/gowork/HeatTrace/frontend && npm install html-to-image 2>&1 | tail -3`
Expected: "added 1 package" or similar success

---

## Verification Checklist

- [ ] `wails build -skipbindings` compiles without errors
- [ ] Dashboard title area shows "Weekly Report" button
- [ ] Clicking the button shows weekly report view with back button
- [ ] Weekly report shows 5 stat cards with delta percentages
- [ ] AI summary is a readable paragraph
- [ ] 7-day × 24-hour heatmap renders with correct colors
- [ ] Insights show in 2-column grid
- [ ] Top apps horizontal bar chart renders
- [ ] Export button triggers html-to-image → Go SaveFileDialog flow
- [ ] TypingPanel shows Typing Rhythm section at bottom
- [ ] ActivityPanel keyboard heatmap has Frequency / Hand Map toggle
- [ ] Hand map mode colors left keys blue, right keys amber
