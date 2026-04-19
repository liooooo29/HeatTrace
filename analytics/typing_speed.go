package analytics

import "HeatTrace/storage"

type TypingSpeed struct {
	AverageCPM  float64            `json:"average_cpm"`
	AverageWPM  float64            `json:"average_wpm"`
	DailySpeed  []DailySpeedPoint  `json:"daily_speed"`
	HourlySpeed []HourlySpeedPoint `json:"hourly_speed"`
}

type DailySpeedPoint struct {
	Date string  `json:"date"`
	CPM  float64 `json:"cpm"`
	WPM  float64 `json:"wpm"`
}

type HourlySpeedPoint struct {
	Hour int     `json:"hour"`
	CPM  float64 `json:"cpm"`
	WPM  float64 `json:"wpm"`
}

func ComputeTypingSpeed(days []storage.DayData) TypingSpeed {
	var allWindows []typingWindow
	hourlyChars := make(map[int]int)
	hourlyMinutes := make(map[int]float64)

	for _, day := range days {
		windows := groupIntoWindows(day.Keyboard)
		allWindows = append(allWindows, windows...)
		for _, w := range windows {
			for h := w.startHour; h <= w.endHour; h++ {
				hourlyChars[h] += w.chars
			}
			hourlyMinutes[w.startHour] += w.minutes
		}
	}

	var totalCPM float64
	for _, w := range allWindows {
		if w.minutes > 0 {
			totalCPM += float64(w.chars) / w.minutes
		}
	}
	avgCPM := 0.0
	if len(allWindows) > 0 {
		avgCPM = totalCPM / float64(len(allWindows))
	}
	avgWPM := avgCPM / 5.0

	var dailySpeed []DailySpeedPoint
	for _, day := range days {
		windows := groupIntoWindows(day.Keyboard)
		var dayCPM float64
		for _, w := range windows {
			if w.minutes > 0 {
				dayCPM += float64(w.chars) / w.minutes
			}
		}
		if len(windows) > 0 {
			dayCPM /= float64(len(windows))
		}
		dailySpeed = append(dailySpeed, DailySpeedPoint{
			Date: day.Date,
			CPM:  dayCPM,
			WPM:  dayCPM / 5.0,
		})
	}

	var hourlySpeed []HourlySpeedPoint
	for h := 0; h < 24; h++ {
		cpm := 0.0
		if hourlyMinutes[h] > 0 {
			cpm = float64(hourlyChars[h]) / hourlyMinutes[h]
		}
		hourlySpeed = append(hourlySpeed, HourlySpeedPoint{Hour: h, CPM: cpm, WPM: cpm / 5.0})
	}

	return TypingSpeed{
		AverageCPM:  avgCPM,
		AverageWPM:  avgWPM,
		DailySpeed:  dailySpeed,
		HourlySpeed: hourlySpeed,
	}
}

type typingWindow struct {
	chars     int
	minutes   float64
	startHour int
	endHour   int
}

func groupIntoWindows(keys []storage.KeyEvent) []typingWindow {
	if len(keys) == 0 {
		return nil
	}
	var windows []typingWindow
	chars := 0
	startTS := keys[0].Timestamp
	lastTS := keys[0].Timestamp

	for _, k := range keys {
		if k.Filtered {
			continue
		}
		gap := k.Timestamp - lastTS
		if gap > 2000 {
			duration := float64(lastTS-startTS) / 60000.0
			if duration > 0 && chars > 0 {
				windows = append(windows, typingWindow{
					chars:     chars,
					minutes:   duration,
					startHour: hourFromTimestamp(startTS),
					endHour:   hourFromTimestamp(lastTS),
				})
			}
			chars = 0
			startTS = k.Timestamp
		}
		chars++
		lastTS = k.Timestamp
	}

	duration := float64(lastTS-startTS) / 60000.0
	if duration > 0 && chars > 0 {
		windows = append(windows, typingWindow{
			chars:     chars,
			minutes:   duration,
			startHour: hourFromTimestamp(startTS),
			endHour:   hourFromTimestamp(lastTS),
		})
	}
	return windows
}
