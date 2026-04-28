package analytics

import (
	"fmt"
	"math"
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

// Insight represents a single insight about the user's week
type Insight struct {
	Icon  string `json:"icon"`
	Text  string `json:"text"`
	TextZh string `json:"text_zh"`
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
	Persona       Persona          `json:"persona"`
	Insights      []Insight        `json:"insights"`
}

func ComputeWeeklyReport(thisWeek, prevWeek []storage.DayData) WeeklyReport {
	report := WeeklyReport{
		DailyGrid: []DailyGridCell{},
		Insights:  []Insight{},
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

	// Insights
	report.Insights = generateInsights(thisWeek, keyboardStats, typingSpeed, usageTime)

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

// --- Insights logic ---

func generateInsights(days []storage.DayData, kb KeyboardStats, ts TypingSpeed, ut UsageTime) []Insight {
	var insights []Insight

	// Peak hour
	if len(kb.HourlyKeys) > 0 {
		maxHour := 0
		maxCount := 0
		for _, h := range kb.HourlyKeys {
			if h.Count > maxCount {
				maxCount = h.Count
				maxHour = h.Hour
			}
		}
		if maxCount > 0 {
			insights = append(insights, Insight{
				Icon: "⏰",
				Text: fmt.Sprintf("Your peak hour is %d:00", maxHour),
				TextZh: fmt.Sprintf("你的效率巅峰在 %d:00", maxHour),
			})
		}
	}

	// Most active day
	if len(days) > 0 {
		type dayKeys struct {
			date  string
			count int
			dow   string
			dowZh string
		}
		dowNames := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
		dowNamesZh := []string{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}
		var dayList []dayKeys
		for _, day := range days {
			count := 0
			for _, k := range day.Keyboard {
				if !k.Filtered {
					count++
				}
			}
			dow := dowNames[0]
			dowZh := dowNamesZh[0]
			if len(day.Date) >= 10 {
				var year, month, dayNum int
				fmt.Sscanf(day.Date, "%d-%d-%d", &year, &month, &dayNum)
				daysSinceEpoch := (year-1970)*365 + (year-1970)/4 - (year-1970)/100 + (year-1970)/400
				for m := 1; m < month; m++ {
					daysSinceEpoch += daysInMonth(m, year)
				}
				daysSinceEpoch += dayNum - 1
				dowIdx := (daysSinceEpoch + 4) % 7
				if dowIdx < 0 {
					dowIdx += 7
				}
				dow = dowNames[dowIdx]
				dowZh = dowNamesZh[dowIdx]
			}
			dayList = append(dayList, dayKeys{date: day.Date, count: count, dow: dow, dowZh: dowZh})
		}
		maxDay := dayList[0]
		for _, d := range dayList[1:] {
			if d.count > maxDay.count {
				maxDay = d
			}
		}
		insights = append(insights, Insight{
			Icon:  "📅",
			Text:  fmt.Sprintf("%s was your busiest day", maxDay.dow),
			TextZh: fmt.Sprintf("%s是你最忙碌的一天", maxDay.dowZh),
		})
	}

	// Typing speed
	if ts.AverageWPM > 0 {
		insights = append(insights, Insight{
			Icon: "🚀",
			Text: fmt.Sprintf("Average typing speed: %.0f WPM", ts.AverageWPM),
			TextZh: fmt.Sprintf("平均打字速度：%.0f WPM", ts.AverageWPM),
		})
	}

	// Active days
	activeDays := 0
	for _, day := range days {
		if len(day.Keyboard) > 0 || len(day.Mouse.Clicks) > 0 {
			activeDays++
		}
	}
	if activeDays >= 3 {
		insights = append(insights, Insight{
			Icon: "🔥",
			Text: fmt.Sprintf("Active %d out of %d days", activeDays, len(days)),
			TextZh: fmt.Sprintf("%d 天中有 %d 天保持活跃", len(days), activeDays),
		})
	}

	// Typing sessions: count distinct active hour blocks per day
	sessions := 0
	for _, day := range days {
		hourActive := make(map[int]bool)
		for _, k := range day.Keyboard {
			if !k.Filtered {
				hourActive[hourFromTimestamp(k.Timestamp)] = true
			}
		}
		sessions += len(hourActive)
	}
	if sessions > 0 {
		insights = append(insights, Insight{
			Icon:  "💻",
			Text:  fmt.Sprintf("%d active hour blocks this week", sessions),
			TextZh: fmt.Sprintf("本周共 %d 个活跃时段", sessions),
		})
	}

	// Top shortcut — placed last as it's the longest
	if len(kb.ModCombo) > 0 {
		top := kb.ModCombo[0]
		insights = append(insights, Insight{
			Icon: "⌨️",
			Text: fmt.Sprintf("Most used shortcut: %s (%d times)", top.Combo, top.Count),
			TextZh: fmt.Sprintf("最常用的快捷键是 %s（%d 次）", top.Combo, top.Count),
		})
	}

	return insights
}

func daysInMonth(month, year int) int {
	switch month {
	case 2:
		if year%4 == 0 && (year%100 != 0 || year%400 == 0) {
			return 29
		}
		return 28
	case 4, 6, 9, 11:
		return 30
	default:
		return 31
	}
}
