// Safe Wails bindings — gracefully handles missing runtime
// Use these instead of direct imports from wailsjs/go/main/App

function getApp() {
  return (window as any)?.go?.main?.App;
}

export async function GetToday(): Promise<string> {
  const app = getApp();
  if (!app?.GetToday) return new Date().toISOString().slice(0, 10);
  return app.GetToday();
}

export async function GetDailySummary(date: string): Promise<any> {
  const app = getApp();
  if (!app?.GetDailySummary) return null;
  return app.GetDailySummary(date);
}

export async function GetRangeSummary(start: string, end: string): Promise<any> {
  const app = getApp();
  if (!app?.GetRangeSummary) return null;
  return app.GetRangeSummary(start, end);
}

export async function GetKeyboardStats(start: string, end: string): Promise<any> {
  const app = getApp();
  if (!app?.GetKeyboardStats) return null;
  return app.GetKeyboardStats(start, end);
}

export async function GetMouseStats(start: string, end: string): Promise<any> {
  const app = getApp();
  if (!app?.GetMouseStats) return null;
  return app.GetMouseStats(start, end);
}

export async function GetTypingSpeed(start: string, end: string): Promise<any> {
  const app = getApp();
  if (!app?.GetTypingSpeed) return null;
  return app.GetTypingSpeed(start, end);
}

export async function GetUsageTime(start: string, end: string): Promise<any> {
  const app = getApp();
  if (!app?.GetUsageTime) return null;
  return app.GetUsageTime(start, end);
}

export async function GetHeatmapData(start: string, end: string): Promise<any> {
  const app = getApp();
  if (!app?.GetHeatmapData) return null;
  return app.GetHeatmapData(start, end);
}

export async function GetHeatmapCurrent(): Promise<any> {
  const app = getApp();
  if (!app?.GetHeatmapCurrent) return null;
  return app.GetHeatmapCurrent();
}

export async function GetConfig(): Promise<any> {
  const app = getApp();
  if (!app?.GetConfig) return null;
  return app.GetConfig();
}

export async function GetDefaultDataDir(): Promise<string> {
  const app = getApp();
  if (!app?.GetDefaultDataDir) return '';
  return app.GetDefaultDataDir();
}

export async function SaveConfig(config: any): Promise<void> {
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

export async function GetLastKeyEvent(): Promise<any> {
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

export async function GetMouseTrail(hours: number): Promise<any[]> {
  const app = getApp();
  if (!app?.GetMouseTrail) return [];
  return app.GetMouseTrail(hours);
}

export function BrowserOpenURL(url: string): void {
  try {
    (window as any)?.runtime?.BrowserOpenURL?.(url);
  } catch {}
}

export async function GetWeeklyReport(): Promise<any> {
  const app = getApp();
  if (!app?.GetWeeklyReport) return null;
  return app.GetWeeklyReport();
}

export async function GetTypingRhythm(start: string, end: string): Promise<any[]> {
  const app = getApp();
  if (!app?.GetTypingRhythm) return [];
  return app.GetTypingRhythm(start, end);
}

export async function SaveReportImage(base64Data: string): Promise<string> {
  const app = getApp();
  if (!app?.SaveReportImage) return '';
  return app.SaveReportImage(base64Data);
}
