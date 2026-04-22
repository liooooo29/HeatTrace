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
	dailyUsage := make([]DailyUsagePoint, 0)
	appMinutes := make(map[string]int)

	for _, day := range days {
		dayMin := storage.CalculateActiveMinutes(day.Keyboard, day.Mouse.Clicks)
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

	appUsage := make([]AppUsagePoint, 0)
	for app, mins := range appMinutes {
		appUsage = append(appUsage, AppUsagePoint{App: app, Minutes: mins})
	}

	return UsageTime{
		TotalMinutes: totalMinutes,
		DailyUsage:   dailyUsage,
		AppUsage:     appUsage,
	}
}
