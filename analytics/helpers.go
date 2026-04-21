package analytics

import (
	"sort"
	"strings"
	"HeatTrace/storage"
	"time"
)

func hourFromTimestamp(ts int64) int {
	return time.UnixMilli(ts).Hour()
}

func joinModifiers(mods []string) string {
	sort.Strings(mods)
	return strings.Join(mods, "+")
}

func topNKeys(freq map[string]int, n int) []storage.KeyCount {
	type kv struct{ k string; v int }
	sorted := make([]kv, 0)
	for k, v := range freq {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].v > sorted[j].v })
	if len(sorted) > n {
		sorted = sorted[:n]
	}
	result := make([]storage.KeyCount, len(sorted))
	for i, s := range sorted {
		result[i] = storage.KeyCount{Key: s.k, Count: s.v}
	}
	return result
}

type ModComboCount struct {
	Combo string `json:"combo"`
	Count int    `json:"count"`
}

type HourlyCount struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

func topNModCombos(freq map[string]int, n int) []ModComboCount {
	type kv struct{ k string; v int }
	sorted := make([]kv, 0)
	for k, v := range freq {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].v > sorted[j].v })
	if len(sorted) > n {
		sorted = sorted[:n]
	}
	result := make([]ModComboCount, len(sorted))
	for i, s := range sorted {
		result[i] = ModComboCount{Combo: s.k, Count: s.v}
	}
	return result
}

func buildHourlyCounts(hourly map[int]int) []HourlyCount {
	result := make([]HourlyCount, 24)
	for h := 0; h < 24; h++ {
		result[h] = HourlyCount{Hour: h, Count: hourly[h]}
	}
	return result
}
