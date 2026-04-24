package analytics

import (
	"fmt"
	"math"
	"sort"
	"strings"

	"HeatTrace/storage"
)

// Persona represents a weekly developer persona
type Persona struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	NameZh  string `json:"name_zh"`
	Emoji   string `json:"emoji"`
	Slogan  string `json:"slogan"`
	SloganZh string `json:"slogan_zh"`
	Color   string `json:"color"`
}

// WeatherDay represents one day's productivity weather
type WeatherDay struct {
	Date      string `json:"date"`
	Weather   string `json:"weather"`
	WeatherZh string `json:"weather_zh"`
	Icon      string `json:"icon"`
	Label     string `json:"label"`
	LabelZh   string `json:"label_zh"`
}

// DailyGridCell for 7x24 heatmap
type DailyGridCell struct {
	Date  string  `json:"date"`
	Hour  int     `json:"hour"`
	Keys  int     `json:"keys"`
	Value float64 `json:"value"`
}

// WeekComparison week-over-week delta
type WeekComparison struct {
	KeysDelta   int `json:"keys_delta"`
	ClicksDelta int `json:"clicks_delta"`
	ActiveDelta int `json:"active_delta"`
	WPMDelta    int `json:"wpm_delta"`
}

// WeeklyReport is the full weekly report data
type WeeklyReport struct {
	StartDate     string           `json:"start_date"`
	EndDate       string           `json:"end_date"`
	TotalKeys     int              `json:"total_keys"`
	TotalClicks   int              `json:"total_clicks"`
	ActiveMinutes int              `json:"active_minutes"`
	AvgWPM        float64          `json:"avg_wpm"`
	AppCount      int              `json:"app_count"`
	PrevWeek      *WeekComparison  `json:"prev_week"`
	DailyGrid     []DailyGridCell  `json:"daily_grid"`
	TopApps       []AppUsagePoint  `json:"top_apps"`
	Persona       Persona          `json:"persona"`
	WeatherDays   []WeatherDay     `json:"weather_days"`
}

func ComputeWeeklyReport(thisWeek, prevWeek []storage.DayData) WeeklyReport {
	report := WeeklyReport{
		DailyGrid:   []DailyGridCell{},
		TopApps:     []AppUsagePoint{},
		WeatherDays: []WeatherDay{},
	}

	if len(thisWeek) > 0 {
		report.StartDate = thisWeek[0].Date
		report.EndDate = thisWeek[len(thisWeek)-1].Date
	}

	// Aggregate this week
	keyboardStats := ComputeKeyboardStats(thisWeek)
	clickStats := computeClickStats(thisWeek)
	typingSpeed := ComputeTypingSpeed(thisWeek)
	usageTime := ComputeUsageTime(thisWeek)

	report.TotalKeys = keyboardStats.TotalKeys
	report.TotalClicks = clickStats.totalClicks
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
	hourlyMap := make(map[string]int)
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
		prevCS := computeClickStats(prevWeek)
		prevTS := ComputeTypingSpeed(prevWeek)
		prevUT := ComputeUsageTime(prevWeek)

		report.PrevWeek = &WeekComparison{
			KeysDelta:   pctDelta(float64(keyboardStats.TotalKeys), float64(prevKB.TotalKeys)),
			ClicksDelta: pctDelta(float64(clickStats.totalClicks), float64(prevCS.totalClicks)),
			ActiveDelta: pctDelta(float64(usageTime.TotalMinutes), float64(prevUT.TotalMinutes)),
			WPMDelta:    pctDelta(typingSpeed.AverageWPM, prevTS.AverageWPM),
		}
	}

	// Persona
	report.Persona = determinePersona(thisWeek, keyboardStats, typingSpeed, usageTime)

	// Weather
	report.WeatherDays = determineWeather(thisWeek, usageTime)

	return report
}

type clickStats struct {
	totalClicks int
}

func computeClickStats(days []storage.DayData) clickStats {
	var total int
	for _, day := range days {
		total += len(day.Mouse.Clicks)
	}
	return clickStats{totalClicks: total}
}

func pctDelta(current, prev float64) int {
	if prev == 0 {
		return 0
	}
	return int(math.Round((current - prev) / prev * 100))
}

// --- Persona logic ---

func determinePersona(days []storage.DayData, kb KeyboardStats, ts TypingSpeed, ut UsageTime) Persona {
	// Count hourly activity
	hourlyKeys := make(map[int]int)
	for _, day := range days {
		for _, k := range day.Keyboard {
			if !k.Filtered {
				hourlyKeys[hourFromTimestamp(k.Timestamp)]++
			}
		}
	}

	totalKeys := 0
	for _, c := range hourlyKeys {
		totalKeys += c
	}

	// Night activity (22:00 - 03:00)
	nightKeys := 0
	for h := 22; h <= 23; h++ {
		nightKeys += hourlyKeys[h]
	}
	for h := 0; h <= 3; h++ {
		nightKeys += hourlyKeys[h]
	}
	nightRatio := float64(nightKeys) / float64(max(totalKeys, 1))

	// Morning activity (06:00 - 10:00)
	morningKeys := 0
	for h := 6; h <= 10; h++ {
		morningKeys += hourlyKeys[h]
	}
	morningRatio := float64(morningKeys) / float64(max(totalKeys, 1))

	// Check modifier combos for copy-paste (ctrl/meta + c/v only)
	copyPasteCount := 0
	for _, combo := range kb.ModCombo {
		lower := strings.ToLower(combo.Combo)
		if (strings.HasPrefix(lower, "ctrl+") || strings.HasPrefix(lower, "meta+") ||
			strings.Contains(lower, "+ctrl+") || strings.Contains(lower, "+meta+")) &&
			(strings.HasSuffix(lower, "+c") || strings.HasSuffix(lower, "+v")) {
			copyPasteCount += combo.Count
		}
	}

	// Long sessions (3+ hours)
	longSessions := 0
	for _, day := range days {
		minuteCount := storage.CalculateActiveMinutes(day.Keyboard, day.Mouse.Clicks)
		if minuteCount >= 180 {
			longSessions++
		}
	}

	// Daily consistency (low stddev)
	dailyKeys := make([]int, len(days))
	for i, day := range days {
		for _, k := range day.Keyboard {
			if !k.Filtered {
				dailyKeys[i]++
			}
		}
	}
	avgDaily := float64(totalKeys) / float64(max(len(days), 1))
	stddev := 0.0
	for _, dk := range dailyKeys {
		diff := float64(dk) - avgDaily
		stddev += diff * diff
	}
	stddev = math.Sqrt(stddev / float64(max(len(days), 1)))
	consistency := 1.0 - stddev/max(avgDaily, 1)

	// Peak-to-average ratio
	peakDaily := 0
	for _, dk := range dailyKeys {
		if dk > peakDaily {
			peakDaily = dk
		}
	}
	peakRatio := float64(peakDaily) / max(avgDaily, 1)

	// Now match persona (priority order)
	if nightRatio > 0.4 {
		return Persona{
			ID: "night_owl", Name: "Night Owl", NameZh: "夜行代码侠",
			Emoji: "🦉", Slogan: "The night is your playground", SloganZh: "深夜才是你的主场",
			Color: "#818CF8",
		}
	}
	if ts.AverageWPM > 60 {
		return Persona{
			ID: "keyboard_storm", Name: "Keyboard Storm", NameZh: "键盘风暴",
			Emoji: "⚡", Slogan: "Fingers blazing at " + fmt.Sprintf("%.0f", ts.AverageWPM) + " WPM", SloganZh: fmt.Sprintf("%.0f WPM 指尖飞驰", ts.AverageWPM),
			Color: "#F59E0B",
		}
	}
	if longSessions >= 3 {
		return Persona{
			ID: "marathon", Name: "Marathon Coder", NameZh: "马拉松编码者",
			Emoji: "🏃", Slogan: "Once you start, you don't stop", SloganZh: "一旦开始，绝不回头",
			Color: "#34D399",
		}
	}
	if copyPasteCount > totalKeys/4 {
		return Persona{
			ID: "ninja", Name: "Copy-Paste Ninja", NameZh: "复制粘贴忍者",
			Emoji: "🥷", Slogan: "Efficiency is the art of not repeating yourself", SloganZh: "效率就是不重复自己",
			Color: "#A78BFA",
		}
	}
	if morningRatio > 0.35 {
		return Persona{
			ID: "morning_warrior", Name: "Morning Warrior", NameZh: "晨间觉醒者",
			Emoji: "🌅", Slogan: "Rise and grind before the world wakes", SloganZh: "在世界醒来之前开工",
			Color: "#FBBF24",
		}
	}
	if consistency > 0.8 && len(days) >= 5 {
		return Persona{
			ID: "steady_hand", Name: "Steady Hand", NameZh: "稳定之手",
			Emoji: "🎯", Slogan: "Consistency is your superpower", SloganZh: "稳定是你的超能力",
			Color: "#06B6D4",
		}
	}
	if peakRatio > 3.0 {
		return Persona{
			ID: "sprinter", Name: "Sprint Runner", NameZh: "冲刺选手",
			Emoji: "💨", Slogan: "All or nothing — that's your style", SloganZh: "要么不做，要么拉满",
			Color: "#EF4444",
		}
	}

	// Default
	return Persona{
		ID: "balanced", Name: "Balanced Coder", NameZh: "均衡编码者",
		Emoji: "⚖️", Slogan: "A little bit of everything", SloganZh: "雨露均沾，全面发展",
		Color: "#6366F1",
	}
}

// --- Weather logic ---

func determineWeather(days []storage.DayData, ut UsageTime) []WeatherDay {
	// Compute daily active keys
	dailyKeys := make(map[string]int)
	for _, day := range days {
		count := 0
		for _, k := range day.Keyboard {
			if !k.Filtered {
				count++
			}
		}
		dailyKeys[day.Date] = count
	}

	// Average
	total := 0
	for _, c := range dailyKeys {
		total += c
	}
	avg := float64(total) / float64(max(len(dailyKeys), 1))

	var result []WeatherDay
	for _, day := range days {
		count := dailyKeys[day.Date]
		ratio := float64(count) / max(avg, 1)

		var w WeatherDay
		w.Date = day.Date

		switch {
		case count == 0:
			w = WeatherDay{Date: day.Date, Weather: "snow", WeatherZh: "雪", Icon: "❄️", Label: "Rest day", LabelZh: "休息日"}
		case ratio > 2.0:
			w = WeatherDay{Date: day.Date, Weather: "thunderstorm", WeatherZh: "雷暴", Icon: "⛈️", Label: "Explosive!", LabelZh: "爆发日"}
		case ratio > 1.0:
			w = WeatherDay{Date: day.Date, Weather: "sunny", WeatherZh: "晴", Icon: "☀️", Label: "Productive", LabelZh: "高效"}
		case ratio > 0.6:
			w = WeatherDay{Date: day.Date, Weather: "cloudy", WeatherZh: "多云", Icon: "⛅", Label: "Steady", LabelZh: "平稳"}
		case ratio > 0.3:
			w = WeatherDay{Date: day.Date, Weather: "overcast", WeatherZh: "阴", Icon: "☁️", Label: "Light day", LabelZh: "轻松"}
		default:
			w = WeatherDay{Date: day.Date, Weather: "rainy", WeatherZh: "雨", Icon: "🌧️", Label: "Slow", LabelZh: "慢节奏"}
		}
		result = append(result, w)
	}

	// Check for rainbow (5+ consecutive sunny days)
	consecutive := 0
	for i, w := range result {
		if w.Weather == "sunny" || w.Weather == "thunderstorm" {
			consecutive++
			if consecutive >= 5 {
				result[i] = WeatherDay{
					Date: result[i].Date, Weather: "rainbow", WeatherZh: "彩虹",
					Icon: "🌈", Label: "Streak bonus!", LabelZh: "连续高产",
				}
			}
		} else {
			consecutive = 0
		}
	}

	return result
}
