package storage

type KeyEvent struct {
	Timestamp int64    `json:"ts"`
	Key       string   `json:"key"`
	Modifiers []string `json:"modifiers,omitempty"`
	App       string   `json:"app,omitempty"`
	Filtered  bool     `json:"filtered,omitempty"`
}

type MouseMove struct {
	Timestamp int64 `json:"ts"`
	X         int   `json:"x"`
	Y         int   `json:"y"`
	ScreenW   int   `json:"screen_w"`
	ScreenH   int   `json:"screen_h"`
}

type MouseClick struct {
	Timestamp int64  `json:"ts"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Button    string `json:"button"`
	App       string `json:"app,omitempty"`
}

type MouseData struct {
	Moves  []MouseMove  `json:"moves"`
	Clicks []MouseClick `json:"clicks"`
}

type DayData struct {
	Date     string     `json:"date"`
	Keyboard []KeyEvent `json:"keyboard"`
	Mouse    MouseData  `json:"mouse"`
}

type KeyCount struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

type DailySummary struct {
	Date            string     `json:"date"`
	TotalKeys       int        `json:"total_keys"`
	FilteredKeys    int        `json:"filtered_keys"`
	MouseMoveCount  int        `json:"mouse_move_count"`
	MouseClickCount int        `json:"mouse_click_count"`
	MouseDistance   float64    `json:"mouse_distance_meters"`
	ActiveMinutes   int        `json:"active_minutes"`
	TopKeys         []KeyCount `json:"top_keys"`
}

type Store interface {
	SaveKeyEvent(date string, event KeyEvent) error
	SaveMouseMove(date string, event MouseMove) error
	SaveMouseClick(date string, event MouseClick) error
	LoadDay(date string) (*DayData, error)
	LoadDateRange(startDate, endDate string) ([]DayData, error)
	ListDates() ([]string, error)
	DeleteOlderThan(days int) error
}
