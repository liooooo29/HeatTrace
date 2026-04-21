package analytics

import (
	"strings"
	"HeatTrace/storage"
)

type KeyboardStats struct {
	TotalKeys    int                `json:"total_keys"`
	FilteredKeys int                `json:"filtered_keys"`
	KeyFrequency []storage.KeyCount `json:"key_frequency"`
	ModCombo     []ModComboCount    `json:"mod_combos"`
	HourlyKeys   []HourlyCount      `json:"hourly_keys"`
}

func ComputeKeyboardStats(days []storage.DayData) KeyboardStats {
	keyFreq := make(map[string]int)
	modCombo := make(map[string]int)
	hourly := make(map[int]int)
	totalKeys := 0
	filteredKeys := 0

	for _, day := range days {
		for _, k := range day.Keyboard {
			totalKeys++
			if k.Filtered {
				filteredKeys++
				continue
			}
			keyFreq[k.Key]++
			if len(k.Modifiers) > 0 {
				// Skip combos where the key itself is a modifier
				lowerKey := strings.ToLower(k.Key)
				if lowerKey != "shift" && lowerKey != "ctrl" && lowerKey != "alt" && lowerKey != "meta" {
					combo := joinModifiers(k.Modifiers) + "+" + k.Key
					modCombo[combo]++
				}
			}
			hour := hourFromTimestamp(k.Timestamp)
			hourly[hour]++
		}
	}

	return KeyboardStats{
		TotalKeys:    totalKeys,
		FilteredKeys: filteredKeys,
		KeyFrequency: topNKeys(keyFreq, 20),
		ModCombo:     topNModCombos(modCombo, 20),
		HourlyKeys:   buildHourlyCounts(hourly),
	}
}
