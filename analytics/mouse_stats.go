package analytics

import (
	"math"
	"HeatTrace/storage"
)

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

		dayDist := calculateDistance(day.Mouse.Moves)
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

func calculateDistance(moves []storage.MouseMove) float64 {
	var total float64
	for i := 1; i < len(moves); i++ {
		dx := float64(moves[i].X - moves[i-1].X)
		dy := float64(moves[i].Y - moves[i-1].Y)
		total += math.Sqrt(dx*dx + dy*dy)
	}
	return total * 0.000264
}
