package analytics

import "HeatTrace/storage"

type MouseStats struct {
	TotalClicks   int              `json:"total_clicks"`
	TotalMoves    int              `json:"total_moves"`
	TotalDistance float64          `json:"total_distance_meters"`
	ClickHeatmap  []ClickPoint     `json:"click_heatmap"`
	LeftClicks    int              `json:"left_clicks"`
	RightClicks   int              `json:"right_clicks"`
	DailyDistance []DailyDistPoint `json:"daily_distance"`
}

type ClickPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type DailyDistPoint struct {
	Date     string  `json:"date"`
	Distance float64 `json:"distance"`
}

func ComputeMouseStats(days []storage.DayData) MouseStats {
	var totalMoves, totalClicks, leftClicks, rightClicks int
	var totalDistance float64
	clickPoints := make([]ClickPoint, 0)
	dailyDist := make([]DailyDistPoint, 0)

	for _, day := range days {
		totalMoves += len(day.Mouse.Moves)
		totalClicks += len(day.Mouse.Clicks)

		dayDist := storage.MouseDistancePixels(day.Mouse.Moves)
		totalDistance += dayDist
		dailyDist = append(dailyDist, DailyDistPoint{Date: day.Date, Distance: dayDist})

		for _, c := range day.Mouse.Clicks {
			clickPoints = append(clickPoints, ClickPoint{X: c.X, Y: c.Y})
			if c.Button == "left" {
				leftClicks++
			} else if c.Button == "right" {
				rightClicks++
			}
		}
	}

	return MouseStats{
		TotalClicks:   totalClicks,
		TotalMoves:    totalMoves,
		TotalDistance: totalDistance,
		ClickHeatmap:  clickPoints,
		LeftClicks:    leftClicks,
		RightClicks:   rightClicks,
		DailyDistance: dailyDist,
	}
}
