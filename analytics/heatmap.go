package analytics

import "HeatTrace/storage"

type HeatmapData struct {
	KeyboardLayout KeyboardHeatmapPoints `json:"keyboard_layout"`
	MouseHeatmap   MouseHeatmapPoints    `json:"mouse_heatmap"`
}

type KeyboardHeatmapPoints struct {
	Keys []KeyHeatPoint `json:"keys"`
}

type KeyHeatPoint struct {
	Key   string  `json:"key"`
	Count int     `json:"count"`
	Value float64 `json:"value"`
}

type MouseHeatmapPoints struct {
	Points []MouseHeatPoint `json:"points"`
}

type MouseHeatPoint struct {
	X     int     `json:"x"`
	Y     int     `json:"y"`
	Value float64 `json:"value"`
}

func ComputeHeatmapData(days []storage.DayData) HeatmapData {
	keyFreq := make(map[string]int)
	var mousePoints []MouseHeatPoint
	var maxKeyCount int

	// Normalize shifted chars to base keys for heatmap layout matching
	var shiftedToBase = map[string]string{
		"!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
		"^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
		"_": "-", "+": "=", "~": "`",
		"{": "[", "}": "]", "|": "\\",
		":": ";", "\"": "'",
		"<": ",", ">": ".", "?": "/",
	}

	for _, day := range days {
		for _, k := range day.Keyboard {
			if !k.Filtered {
				key := k.Key
				if base, ok := shiftedToBase[key]; ok {
					key = base
				}
				keyFreq[key]++
				if keyFreq[key] > maxKeyCount {
					maxKeyCount = keyFreq[key]
				}
			}
		}
		for _, c := range day.Mouse.Clicks {
			mousePoints = append(mousePoints, MouseHeatPoint{X: c.X, Y: c.Y, Value: 1})
		}
		for _, m := range day.Mouse.Moves {
			if m.Timestamp%5000 == 0 {
				mousePoints = append(mousePoints, MouseHeatPoint{X: m.X, Y: m.Y, Value: 0.3})
			}
		}
	}

	var keyPoints []KeyHeatPoint
	for key, count := range keyFreq {
		val := 0.0
		if maxKeyCount > 0 {
			val = float64(count) / float64(maxKeyCount)
		}
		keyPoints = append(keyPoints, KeyHeatPoint{Key: key, Count: count, Value: val})
	}

	return HeatmapData{
		KeyboardLayout: KeyboardHeatmapPoints{Keys: keyPoints},
		MouseHeatmap:   MouseHeatmapPoints{Points: mousePoints},
	}
}
