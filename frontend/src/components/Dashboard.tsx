import { useEffect, useState, useCallback, useRef } from 'react';
import { GetDailySummary, GetRangeSummary, GetHeatmapData, GetHeatmapCurrent, GetTypingSpeed, GetUsageTime, BrowserOpenURL, ToggleMonitor, GetConfig, GetMonitorStatus, GetKeyCount, GetMouseClickCount } from '../wails-bindings';
import { StatCard } from './StatCard';
import { TypingECG } from './TypingECG';
import { KeyboardHeatmap } from './KeyboardHeatmap';
import { WeeklyReport } from './WeeklyReport';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { DailySummary, KeyHeatPoint } from '../types';

const KEY_DISPLAY: Record<string, string> = {
  ' ': 'Space', 'Backspace': '⌫', 'Tab': '⇥', 'Enter': '↵',
  'Esc': 'Esc', 'Caps': '⇪', 'Shift': '⇧', 'Ctrl': '⌃',
  'Opt': '⌥', 'Cmd': '⌘', 'Delete': 'Del',
};

function formatKeyName(key: string): string {
  return KEY_DISPLAY[key] || (key.length === 1 ? key.toUpperCase() : key);
}

interface DashboardProps {
  dateRange: { start: string; end: string };
  lang: Lang;
  monitorRunning: boolean;
  accessErr: string;
  onMonitorChange: () => void;
  historyMode?: boolean;
  onToggleHistory?: () => void;
  onDateChange?: (start: string, end: string) => void;
}

export function Dashboard({ dateRange, lang, monitorRunning, accessErr, onMonitorChange, historyMode, onToggleHistory, onDateChange }: DashboardProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingMonitor, setStartingMonitor] = useState(false);
  const [configInfo, setConfigInfo] = useState<any>(null);
  const [showWeekly, setShowWeekly] = useState(false);
  const [heatmapKeys, setHeatmapKeys] = useState<KeyHeatPoint[]>([]);
  const [avgWPM, setAvgWPM] = useState(0);
  const [yesterdayKeys, setYesterdayKeys] = useState(0);
  const [topApps, setTopApps] = useState<any[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const initialLoad = useRef(true);

  useEffect(() => {
    GetConfig().then(c => { if (c) setConfigInfo(c); }).catch(() => {});
  }, []);

  // Data loading — today: real-time poll; range: load once
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const isSingleDay = dateRange.start === dateRange.end;

    async function load(showLoading = false) {
      if (showLoading) setLoading(true);
      try {
        const data = isSingleDay
          ? await GetDailySummary(dateRange.end)
          : await GetRangeSummary(dateRange.start, dateRange.end);
        setSummary(data);
      } catch (e) {
        console.error('Failed to load summary:', e);
      } finally {
        if (showLoading) setLoading(false);
      }
    }
    load(initialLoad.current);
    initialLoad.current = false;
    let keyTimer: ReturnType<typeof setInterval> | undefined;
    let clickTimer: ReturnType<typeof setInterval> | undefined;

    if (isSingleDay) {
      timer = setInterval(() => load(false), 5000);

      // Poll key count — reload on keyboard changes
      let lastKeyCount = -1;
      keyTimer = setInterval(async () => {
        try {
          const count = await GetKeyCount();
          if (count !== lastKeyCount) {
            if (lastKeyCount >= 0) load(false);
            lastKeyCount = count;
          }
        } catch {}
      }, 200);

      // Poll mouse click count — reload on clicks
      let lastClickCount = -1;
      clickTimer = setInterval(async () => {
        try {
          const count = await GetMouseClickCount();
          if (count !== lastClickCount) {
            if (lastClickCount >= 0) load(false);
            lastClickCount = count;
          }
      } catch {}
    }, 500);
    }

    return () => {
      clearInterval(timer);
      clearInterval(keyTimer);
      clearInterval(clickTimer);
    };
  }, [dateRange]);

  // Heatmap — reload on date change
  useEffect(() => {
    GetHeatmapData(dateRange.start, dateRange.end).then(hm => {
      if (hm?.keyboard_layout?.keys) setHeatmapKeys(hm.keyboard_layout.keys);
    }).catch(() => {});
  }, [dateRange]);

  useEffect(() => {
    let lastKeyCount = -1;
    const timer = setInterval(async () => {
      try {
        const count = await GetKeyCount();
        if (count !== lastKeyCount && lastKeyCount >= 0) {
          const hm = await GetHeatmapCurrent();
          if (hm?.keyboard_layout?.keys) setHeatmapKeys(hm.keyboard_layout.keys);
        }
        lastKeyCount = count;
      } catch {}
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // WPM, yesterday comparison, top apps — load on date change
  useEffect(() => {
    async function load() {
      try {
        const d = new Date(dateRange.end);
        d.setDate(d.getDate() - 1);
        const yesterday = d.toISOString().slice(0, 10);
        const [ts, ut, ySummary] = await Promise.all([
          GetTypingSpeed(dateRange.start, dateRange.end),
          GetUsageTime(dateRange.start, dateRange.end),
          GetDailySummary(yesterday),
        ]);
        if (ts?.average_wpm != null) setAvgWPM(ts.average_wpm);
        if (ut?.app_usage) setTopApps(ut.app_usage.sort((a: any, b: any) => b.minutes - a.minutes).slice(0, 5));
        if (ySummary?.total_keys != null) setYesterdayKeys(ySummary.total_keys);
      } catch {}
    }
    load();
  }, [dateRange]);

  const handleStartMonitor = useCallback(async () => {
    setStartingMonitor(true);
    try {
      await ToggleMonitor();
      // Re-check status after toggle
      const status = await GetMonitorStatus();
      if (status.running) {
        onMonitorChange();
      } else if (status.access_err) {
        onMonitorChange();
      }
    } catch (e) {
      console.error('ToggleMonitor failed:', e);
    } finally {
      setStartingMonitor(false);
    }
  }, [onMonitorChange]);

  // Setup page — no accessibility permission
  if (accessErr) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--fg)' }}>{t('setup.title', lang)}</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('setup.subtitle', lang)}</p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {[
              { n: 1, title: t('setup.step1Title', lang), desc: t('setup.step1Desc', lang) },
              { n: 2, title: t('setup.step2Title', lang), desc: t('setup.step2Desc', lang) },
              { n: 3, title: t('setup.step3Title', lang), desc: t('setup.step3Desc', lang) },
            ].map(step => (
              <div key={step.n} className="card p-4 flex gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--accent-bg)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{step.n}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>{step.title}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => BrowserOpenURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {t('setup.openSettings', lang)}
            </button>
            <button
              onClick={handleStartMonitor}
              disabled={startingMonitor}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{
                backgroundColor: startingMonitor ? 'var(--surface-2)' : 'var(--green-bg)',
                color: 'var(--green)',
                border: '1px solid var(--green-border)',
              }}>
              {startingMonitor && (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              )}
              {startingMonitor ? t('setup.checking', lang) : t('setup.startMonitor', lang)}
            </button>
          </div>

          {/* Config info */}
          {configInfo && (
            <div className="mt-6">
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>{t('setup.configTitle', lang)}</div>
              <div className="card p-3 text-xs" style={{ color: 'var(--fg-2)' }}>
                {t('setup.configDesc', lang)
                  .replace('{interval}', configInfo.mouse_sample_interval_ms)
                  .replace('{days}', configInfo.data_retention_days)
                  .replace('{count}', configInfo.blacklisted_apps?.length || '0')}
                {(!configInfo.blacklisted_apps || configInfo.blacklisted_apps.length === 0) &&
                  ' ' + t('setup.configDescNone', lang)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="page-title">{t('dash.title', lang)}</h2>
          <p className="page-subtitle">{t('dash.subtitle', lang)}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
      </div>
    );
  }

  // No data
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-bg)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
          </svg>
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>
          {t('dash.noData', lang)}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          {monitorRunning ? t('dash.noDataDesc', lang) : t('dash.noDataDesc', lang)}
        </div>
        {!monitorRunning && (
          <button
            onClick={handleStartMonitor}
            disabled={startingMonitor}
            className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            {startingMonitor ? t('setup.checking', lang) : t('setup.startMonitor', lang)}
          </button>
        )}
      </div>
    );
  }

  // Weekly report view
  if (showWeekly) {
    return (
      <div key="weekly" style={{ animation: 'keyfadeIn 0.25s ease' }}>
        <WeeklyReport lang={lang} onBack={() => setShowWeekly(false)} />
      </div>
    );
  }

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  const today = new Date().toISOString().slice(0, 10);

  const isToday = dateRange.start === today && dateRange.end === today;
  const daysDiff = Math.round((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / 86400000) + 1;
  const titleLabel = isToday
    ? t('dash.today', lang)
    : daysDiff === 7 ? t('dash.7d', lang)
    : daysDiff === 30 ? t('dash.30d', lang)
    : `${dateRange.start} — ${dateRange.end}`;
  const dateLabel = isToday
    ? new Date(today + 'T00:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })
    : `${dateRange.start} — ${dateRange.end}`;

  const applyPreset = (days: number) => {
    if (!onDateChange) return;
    if (days === 0) {
      onDateChange(today, today);
      if (historyMode) onToggleHistory?.();
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days + 1);
      onDateChange(d.toISOString().slice(0, 10), today);
      if (!historyMode) onToggleHistory?.();
    }
    setShowPresets(false);
  };

  return (
    <div key="main" style={{ animation: 'keyfadeIn 0.25s ease' }}><div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">{titleLabel}</h2>
          <div className="relative mt-0.5">
            <button onClick={() => setShowPresets(v => !v)}
              className="text-[12px] flex items-center gap-1 px-1 py-0.5 rounded-md"
              style={{ color: isToday ? 'var(--muted)' : 'var(--accent)' }}>
              {dateLabel}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showPresets ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showPresets && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowPresets(false)} />
                <div className="absolute left-0 top-7 z-40 rounded-lg p-1 space-y-0.5"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  {[
                    { label: t('dash.today', lang), days: 0 },
                    { label: t('dash.7d', lang), days: 7 },
                    { label: t('dash.30d', lang), days: 30 },
                  ].map(p => (
                    <button key={p.days} onClick={() => applyPreset(p.days)}
                      className="w-full text-left px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap"
                      style={{ color: 'var(--fg)' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWeekly(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {t('dash.weeklyReport', lang)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard
          label={t('dash.keys', lang)}
          value={summary.total_keys.toLocaleString()}
          color="var(--accent)"
          delta={yesterdayKeys > 0 ? Math.round((summary.total_keys - yesterdayKeys) / yesterdayKeys * 100) : undefined}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8"/></svg>}
        />
        <StatCard
          label={t('dash.wpm', lang)}
          value={avgWPM > 0 ? avgWPM.toFixed(0) : '—'}
          color="var(--green)"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <StatCard
          label={t('dash.active', lang)}
          value={formatMinutes(summary.active_minutes)}
          color="var(--amber)"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label={t('dash.clicks', lang)}
          value={summary.mouse_click_count.toLocaleString()}
          color="var(--amber)"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v8a8 8 0 0 0 16 0V6a4 4 0 0 0-4-4h-2a4 4 0 0 0-4 4"/><path d="M12 2v6"/></svg>}
        />
      </div>

      {/* Top Apps */}
      {topApps.length > 0 && (
        <div className="mb-6">
          <h3 className="section-title">{t('dash.topApps', lang)}</h3>
          <div className="flex flex-wrap gap-2">
            {topApps.map((app, i) => {
              const maxMin = topApps[0]?.minutes || 1;
              const ratio = app.minutes / maxMin;
              return (
                <div key={app.app}
                  className="card px-3 py-2 flex items-center gap-3"
                  style={{ opacity: i === 0 ? 1 : 0.5 + 0.5 * ratio }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--fg)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.app}
                  </span>
                  <span className="badge badge-accent">
                    {app.minutes}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Typing ECG — real-time rhythm */}
      <div className="mb-6">
        <TypingECG dateRange={dateRange} lang={lang} />
      </div>

      {/* Keyboard Heatmap */}
      {heatmapKeys.length > 0 && (
        <div className="mb-6">
          <KeyboardHeatmap keys={heatmapKeys} />
        </div>
      )}

      {(summary.top_keys?.length ?? 0) > 0 && (
        <div>
          <h3 className="section-title">{t('dash.topKeys', lang)}</h3>
          <div className="flex flex-wrap gap-2">
            {(summary.top_keys ?? []).slice(0, 10).map((k, i) => {
              const maxCount = summary.top_keys?.[0]?.count || 1;
              const ratio = k.count / maxCount;
              const displayKey = formatKeyName(k.key);
              return (
                <div key={k.key}
                  className="card px-3 py-2 flex items-center gap-3"
                  style={{ opacity: i === 0 ? 1 : 0.5 + 0.5 * ratio }}>
                  <span className="text-base font-bold tabular-nums" style={{ color: 'var(--accent)', minWidth: displayKey.length > 2 ? 'auto' : '2ch' }}>
                    {displayKey}
                  </span>
                  <span className="badge badge-accent">
                    {k.count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
