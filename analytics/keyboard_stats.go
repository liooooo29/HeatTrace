package analytics

import "HeatTrace/storage"

type KeyboardStats struct {
	TotalKeys    int                `json:"total_keys"`
	FilteredKeys int                `json:"filtered_keys"`
	KeyFrequency []storage.KeyCount `json:"key_frequency"`
	ModCombo     []ModComboCount    `json:"mod_combos"`
	HourlyKeys   []HourlyCount      `json:"hourly_keys"`
}

// shiftedToBase maps shifted punctuation to base keys, for normalizing old data.
var shiftedToBase = map[string]string{
	"!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
	"^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
	"_": "-", "+": "=", "~": "`",
	"{": "[", "}": "]", "|": "\\",
	":": ";", "\"": "'",
	"<": ",", ">": ".", "?": "/",
}

func normalizeKey(key string) string {
	if len(key) == 1 {
		if base, ok := shiftedToBase[key]; ok {
			return base
		}
	}
	return key
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
			normalizedKey := normalizeKey(k.Key)
			keyFreq[normalizedKey]++
			if len(k.Modifiers) > 0 {
				combo := joinModifiers(k.Modifiers) + "+" + normalizedKey
				modCombo[combo]++
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
