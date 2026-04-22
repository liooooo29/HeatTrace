package analytics

import (
	"fmt"
	"sort"

	"HeatTrace/storage"
)

type RhythmPoint struct {
	Time string  `json:"time"`
	CPM  float64 `json:"cpm"`
	Keys int     `json:"keys"`
}

func ComputeTypingRhythm(days []storage.DayData) []RhythmPoint {
	type window struct {
		keys int
		date string
		hour int
		min  int
	}
	windows := make(map[string]*window)

	for _, day := range days {
		for _, k := range day.Keyboard {
			if k.Filtered {
				continue
			}
			hour := hourFromTimestamp(k.Timestamp)
			minute := int((k.Timestamp % 3600000) / 60000)
			key := fmt.Sprintf("%s %02d:%02d", day.Date, hour, minute)
			if _, ok := windows[key]; !ok {
				windows[key] = &window{date: day.Date, hour: hour, min: minute}
			}
			windows[key].keys++
		}
	}

	result := make([]RhythmPoint, 0, len(windows))
	for key, w := range windows {
		_ = key
		cpm := float64(w.keys)
		result = append(result, RhythmPoint{
			Time: fmt.Sprintf("%s %02d:%02d", w.date, w.hour, w.min),
			CPM:  cpm,
			Keys: w.keys,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Time < result[j].Time
	})
	return result
}
