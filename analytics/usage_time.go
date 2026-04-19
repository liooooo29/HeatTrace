package analytics

import "HeatTrace/storage"

type UsageTime struct {
	TotalMinutes int               `json:"total_minutes"`
	DailyUsage   []DailyUsagePoint `json:"daily_usage"`
	AppUsage     []AppUsagePoint   `json:"app_usage"`
}

type DailyUsagePoint struct {
	Date    string `json:"date"`
	Minutes int    `json:"minutes"`
}

type AppUsagePoint struct {
	App     string `json:"app"`
	Minutes int    `json:"minutes"`
}

func ComputeUsageTime(days []storage.DayData) UsageTime {
	var totalMinutes int
	var dailyUsage []DailyUsagePoint
	appMinutes := make(map[string]int)

	for _, day := range days {
		dayMin := calculateActiveMinutes(day.Keyboard, day.Mouse.Clicks)
		totalMinutes += dayMin
		dailyUsage = append(dailyUsage, DailyUsagePoint{Date: day.Date, Minutes: dayMin})

		for _, k := range day.Keyboard {
			if k.App != "" && !k.Filtered {
				appMinutes[k.App]++
			}
		}
		for _, c := range day.Mouse.Clicks {
			if c.App != "" {
				appMinutes[c.App]++
			}
		}
	}

	var appUsage []AppUsagePoint
	for app, mins := range appMinutes {
		appUsage = append(appUsage, AppUsagePoint{App: app, Minutes: mins})
	}

	return UsageTime{
		TotalMinutes: totalMinutes,
		DailyUsage:   dailyUsage,
		AppUsage:     appUsage,
	}
}

func calculateActiveMinutes(keys []storage.KeyEvent, clicks []storage.MouseClick) int {
	if len(keys) == 0 && len(clicks) == 0 {
		return 0
	}
	var minTS, maxTS int64 = 1<<62, 0
	for _, k := range keys {
		if k.Timestamp < minTS {
			minTS = k.Timestamp
		}
		if k.Timestamp > maxTS {
			maxTS = k.Timestamp
		}
	}
	for _, c := range clicks {
		if c.Timestamp < minTS {
			minTS = c.Timestamp
		}
		if c.Timestamp > maxTS {
			maxTS = c.Timestamp
		}
	}
	return int((maxTS - minTS) / 60000)
}
