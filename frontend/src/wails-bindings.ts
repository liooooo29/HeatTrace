// Safe Wails bindings — gracefully handles missing runtime
// Use these instead of direct imports from wailsjs/go/main/App

import type {
  DailySummary,
  KeyboardStats,
  TypingSpeed,
  UsageTime,
  AppConfig,
  HeatmapData,
  WeeklyReport,
  RhythmPoint,
  LastKeyEvent,
} from './types';

function getApp() {
  return (window as any)?.go?.main?.App;
}

export async function GetToday(): Promise<string> {
  const app = getApp();
  if (!app?.GetToday) return new Date().toISOString().slice(0, 10);
  return app.GetToday();
}

export async function GetDailySummary(date: string): Promise<DailySummary | null> {
  const app = getApp();
  if (!app?.GetDailySummary) return null;
  return app.GetDailySummary(date);
}

export async function GetRangeSummary(start: string, end: string): Promise<DailySummary | null> {
  const app = getApp();
  if (!app?.GetRangeSummary) return null;
  return app.GetRangeSummary(start, end);
}

export async function GetKeyboardStats(start: string, end: string): Promise<KeyboardStats | null> {
  const app = getApp();
  if (!app?.GetKeyboardStats) return null;
  return app.GetKeyboardStats(start, end);
}

export async function GetTypingSpeed(start: string, end: string): Promise<TypingSpeed | null> {
  const app = getApp();
  if (!app?.GetTypingSpeed) return null;
  return app.GetTypingSpeed(start, end);
}

export async function GetUsageTime(start: string, end: string): Promise<UsageTime | null> {
  const app = getApp();
  if (!app?.GetUsageTime) return null;
  return app.GetUsageTime(start, end);
}

export async function GetHeatmapData(start: string, end: string): Promise<HeatmapData | null> {
  const app = getApp();
  if (!app?.GetHeatmapData) return null;
  return app.GetHeatmapData(start, end);
}

export async function GetHeatmapCurrent(): Promise<HeatmapData | null> {
  const app = getApp();
  if (!app?.GetHeatmapCurrent) return null;
  return app.GetHeatmapCurrent();
}

export async function GetConfig(): Promise<AppConfig | null> {
  const app = getApp();
  if (!app?.GetConfig) return null;
  return app.GetConfig();
}

export async function GetDefaultDataDir(): Promise<string> {
  const app = getApp();
  if (!app?.GetDefaultDataDir) return '';
  return app.GetDefaultDataDir();
}

export async function SwitchDataDir(newDir: string): Promise<void> {
  const app = getApp();
  if (!app?.SwitchDataDir) return;
  return app.SwitchDataDir(newDir);
}

export async function PickDataDir(): Promise<string> {
  const app = getApp();
  if (!app?.PickDataDir) return '';
  return app.PickDataDir();
}

export async function SaveConfig(config: AppConfig): Promise<void> {
  const app = getApp();
  if (!app?.SaveConfig) return;
  return app.SaveConfig(config);
}

export async function GetMonitorStatus(): Promise<{ running: boolean; access_err: string }> {
  const app = getApp();
  if (!app?.GetMonitorStatus) return { running: false, access_err: '' };
  return app.GetMonitorStatus();
}

export async function ToggleMonitor(): Promise<boolean> {
  const app = getApp();
  if (!app?.ToggleMonitor) return false;
  return app.ToggleMonitor();
}

export async function TestMonitor(): Promise<{ success: boolean; message: string; count: number }> {
  const app = getApp();
  if (!app?.TestMonitor) return { success: false, message: 'Not available', count: 0 };
  return app.TestMonitor();
}

export async function GetEventCount(): Promise<number> {
  const app = getApp();
  if (!app?.GetEventCount) return 0;
  return app.GetEventCount();
}

export async function GetKeyCount(): Promise<number> {
  const app = getApp();
  if (!app?.GetKeyCount) return 0;
  return app.GetKeyCount();
}

export async function GetMouseClickCount(): Promise<number> {
  const app = getApp();
  if (!app?.GetMouseClickCount) return 0;
  return app.GetMouseClickCount();
}

export async function GetLastKeyEvent(): Promise<LastKeyEvent | null> {
  const app = getApp();
  if (!app?.GetLastKeyEvent) return null;
  return app.GetLastKeyEvent();
}

export async function ClearAllData(): Promise<void> {
  const app = getApp();
  if (!app?.ClearAllData) return;
  return app.ClearAllData();
}

export async function Quit(): Promise<void> {
  const app = getApp();
  if (!app?.Quit) return;
  return app.Quit();
}

export async function GetDataVersion(): Promise<number> {
  const app = getApp();
  if (!app?.GetDataVersion) return 0;
  return app.GetDataVersion();
}

export function BrowserOpenURL(url: string): void {
  try {
    (window as any)?.runtime?.BrowserOpenURL?.(url);
  } catch {}
}

export async function GetWeeklyReport(): Promise<WeeklyReport | null> {
  const app = getApp();
  if (!app?.GetWeeklyReport) return null;
  return app.GetWeeklyReport();
}

export async function GetTypingRhythm(start: string, end: string): Promise<RhythmPoint[]> {
  const app = getApp();
  if (!app?.GetTypingRhythm) return [];
  return app.GetTypingRhythm(start, end);
}

export async function SaveReportImage(base64Data: string): Promise<string> {
  const app = getApp();
  if (!app?.SaveReportImage) return '';
  return app.SaveReportImage(base64Data);
}

export interface UpdateInfo {
  available: boolean;
  version: string;
  notes: string;
  downloadUrl: string;
  assetName: string;
}

export async function GetVersion(): Promise<string> {
  const app = getApp();
  if (!app?.GetVersion) return 'dev';
  return app.GetVersion();
}

export async function CheckForUpdate(): Promise<UpdateInfo> {
  const app = getApp();
  if (!app?.CheckForUpdate) return { available: false, version: '', notes: '', downloadUrl: '', assetName: '' };
  return app.CheckForUpdate();
}

export async function OpenDownloadPage(url: string): Promise<void> {
  const app = getApp();
  if (!app?.OpenDownloadPage) return;
  return app.OpenDownloadPage(url);
}
