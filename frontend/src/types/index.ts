export interface DailySummary {
  date: string;
  total_keys: number;
  filtered_keys: number;
  mouse_move_count: number;
  mouse_click_count: number;
  mouse_distance_meters: number;
  active_minutes: number;
  top_keys: KeyCount[];
}

export interface KeyCount {
  key: string;
  count: number;
}

export interface KeyboardStats {
  total_keys: number;
  filtered_keys: number;
  key_frequency: KeyCount[];
  mod_combos: ModComboCount[];
  hourly_keys: HourlyCount[];
}

export interface ModComboCount {
  combo: string;
  count: number;
}

export interface HourlyCount {
  hour: number;
  count: number;
}

export interface MouseStats {
  total_clicks: number;
  total_moves: number;
  total_distance_meters: number;
  click_heatmap: ClickPoint[];
  left_clicks: number;
  right_clicks: number;
  daily_distance: DailyDistPoint[];
}

export interface ClickPoint {
  x: number;
  y: number;
}

export interface DailyDistPoint {
  date: string;
  distance: number;
}

export interface TypingSpeed {
  average_cpm: number;
  average_wpm: number;
  daily_speed: DailySpeedPoint[];
  hourly_speed: HourlySpeedPoint[];
}

export interface DailySpeedPoint {
  date: string;
  cpm: number;
  wpm: number;
}

export interface HourlySpeedPoint {
  hour: number;
  cpm: number;
  wpm: number;
}

export interface UsageTime {
  total_minutes: number;
  daily_usage: DailyUsagePoint[];
  app_usage: AppUsagePoint[];
}

export interface DailyUsagePoint {
  date: string;
  minutes: number;
}

export interface AppUsagePoint {
  app: string;
  minutes: number;
}

export interface AppConfig {
  monitor_enabled: boolean;
  mouse_sample_interval_ms: number;
  blacklisted_apps: string[];
  theme: string;
  data_retention_days: number;
  data_dir: string;
}

export interface HeatmapData {
  keyboard_layout: KeyboardHeatmapPoints;
  mouse_heatmap: MouseHeatmapPoints;
}

export interface KeyboardHeatmapPoints {
  keys: KeyHeatPoint[];
}

export interface KeyHeatPoint {
  key: string;
  count: number;
  value: number;
}

export interface MouseHeatmapPoints {
  points: MouseHeatPoint[];
}

export interface MouseHeatPoint {
  x: number;
  y: number;
  value: number;
}

export type Tab = 'overview' | 'activity' | 'typing' | 'settings';

export interface Persona {
  id: string;
  name: string;
  name_zh: string;
  emoji: string;
  slogan: string;
  slogan_zh: string;
  color: string;
}

export interface WeatherDay {
  date: string;
  weather: string;
  weather_zh: string;
  icon: string;
  label: string;
  label_zh: string;
}

export interface DailyGridCell {
  date: string;
  hour: number;
  keys: number;
  value: number;
}

export interface WeekComparison {
  keys_delta: number;
  clicks_delta: number;
  active_delta: number;
  wpm_delta: number;
}

export interface WeeklyReport {
  start_date: string;
  end_date: string;
  total_keys: number;
  total_clicks: number;
  total_distance_meters: number;
  active_minutes: number;
  avg_wpm: number;
  app_count: number;
  prev_week: WeekComparison | null;
  daily_grid: DailyGridCell[] | null;
  top_apps: AppUsagePoint[] | null;
  persona: Persona;
  weather_days: WeatherDay[] | null;
}

export interface RhythmPoint {
  time: string;
  cpm: number;
  keys: number;
}
