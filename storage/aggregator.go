package storage

import (
	"math"
	"sort"
)

type Aggregator struct {
	store Store
}

func NewAggregator(store Store) *Aggregator {
	return &Aggregator{store: store}
}

func (a *Aggregator) GetDailySummary(date string) (*DailySummary, error) {
	day, err := a.store.LoadDay(date)
	if err != nil {
		return nil, err
	}

	totalKeys := len(day.Keyboard)
	filteredKeys := 0
	keyCounts := make(map[string]int)

	for _, k := range day.Keyboard {
		if k.Filtered {
			filteredKeys++
			continue
		}
		keyCounts[k.Key]++
	}

	var topKeys []KeyCount
	for key, count := range keyCounts {
		topKeys = append(topKeys, KeyCount{Key: key, Count: count})
	}
	sort.Slice(topKeys, func(i, j int) bool {
		return topKeys[i].Count > topKeys[j].Count
	})
	if len(topKeys) > 10 {
		topKeys = topKeys[:10]
	}

	mouseDist := mouseDistancePixels(day.Mouse.Moves)
	activeMin := calculateActiveMinutes(day.Keyboard, day.Mouse.Clicks)

	return &DailySummary{
		Date:            date,
		TotalKeys:       totalKeys,
		FilteredKeys:    filteredKeys,
		MouseMoveCount:  len(day.Mouse.Moves),
		MouseClickCount: len(day.Mouse.Clicks),
		MouseDistance:   mouseDist,
		ActiveMinutes:   activeMin,
		TopKeys:         topKeys,
	}, nil
}


func (a *Aggregator) GetRangeSummary(startDate, endDate string) (*DailySummary, error) {
	days, err := a.store.LoadDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	totalKeys := 0
	filteredKeys := 0
	totalClicks := 0
	totalMoves := 0
	keyCounts := make(map[string]int)
	var allKeyEvents []KeyEvent
	var allClicks []MouseClick
	var allMoves []MouseMove

	for _, day := range days {
		totalKeys += len(day.Keyboard)
		for _, k := range day.Keyboard {
			if k.Filtered {
				filteredKeys++
				continue
			}
			keyCounts[k.Key]++
			allKeyEvents = append(allKeyEvents, k)
		}
		totalClicks += len(day.Mouse.Clicks)
		totalMoves += len(day.Mouse.Moves)
		allClicks = append(allClicks, day.Mouse.Clicks...)
		allMoves = append(allMoves, day.Mouse.Moves...)
	}

	var topKeys []KeyCount
	for key, count := range keyCounts {
		topKeys = append(topKeys, KeyCount{Key: key, Count: count})
	}
	sort.Slice(topKeys, func(i, j int) bool {
		return topKeys[i].Count > topKeys[j].Count
	})
	if len(topKeys) > 10 {
		topKeys = topKeys[:10]
	}

	mouseDist := mouseDistancePixels(allMoves)
	activeMin := calculateActiveMinutes(allKeyEvents, allClicks)

	return &DailySummary{
		Date:            startDate + " — " + endDate,
		TotalKeys:       totalKeys,
		FilteredKeys:    filteredKeys,
		MouseMoveCount:  totalMoves,
		MouseClickCount: totalClicks,
		MouseDistance:   mouseDist,
		ActiveMinutes:   activeMin,
		TopKeys:         topKeys,
	}, nil
}

func mouseDistancePixels(moves []MouseMove) float64 {
	var total float64
	for i := 1; i < len(moves); i++ {
		dx := float64(moves[i].X - moves[i-1].X)
		dy := float64(moves[i].Y - moves[i-1].Y)
		total += math.Sqrt(dx*dx + dy*dy)
	}
	return total * 0.000264 // pixels to meters
}

func calculateActiveMinutes(keys []KeyEvent, clicks []MouseClick) int {
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
