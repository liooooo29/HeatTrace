import { useEffect, useState, useCallback, useRef } from 'react';
import { GetDailySummary, GetRangeSummary, GetHeatmapData, GetHeatmapCurrent, GetTypingSpeed, GetUsageTime, BrowserOpenURL, ToggleMonitor, GetConfig, GetMonitorStatus, GetKeyCount, GetMouseClickCount } from '../wails-bindings';
import { StatCard } from './StatCard';
import { TypingECG } from './TypingECG';
import { KeyboardHeatmap } from './KeyboardHeatmap';
import { WeeklyReport } from './WeeklyReport';
import { SegmentedBar } from './SegmentedBar';
import { SegmentedSpinner } from './SegmentedSpinner';
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
  currentWpm?: number;
  peakWpm?: number;
}

export function Dashboard({ dateRange, lang, monitorRunning, accessErr, onMonitorChange, historyMode, onToggleHistory, onDateChange, currentWpm, peakWpm }: DashboardProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingMonitor, setStartingMonitor] = useState(false);
  const [configInfo, setConfigInfo] = useState<any>(null);
  const [showWeekly, setShowWeekly] = useState(false);
  const [heatmapKeys, setHeatmapKeys] = useState<KeyHeatPoint[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [avgWPM, setAvgWPM] = useState(0);
  const [yesterdayKeys, setYesterdayKeys] = useState(0);
  const [topApps, setTopApps] = useState<any[]>([]);
  const initialLoad = useRef(true);

  useEffect(() => {
    GetConfig().then(c => { if (c) setConfigInfo(c); }).catch(() => {});
  }, []);

  useEffect(() => {
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

    if (!isSingleDay) return;

    let lastKeyCount = -1;
    let lastClickCount = -1;
    const poller = setInterval(async () => {
      try {
        const [keyCount, clickCount] = await Promise.all([GetKeyCount(), GetMouseClickCount()]);
        if ((keyCount !== lastKeyCount && lastKeyCount >= 0) ||
            (clickCount !== lastClickCount && lastClickCount >= 0)) {
          load(false);
          setDataVersion(v => v + 1);
          const hm = await GetHeatmapCurrent();
          if (hm?.keyboard_layout?.keys) setHeatmapKeys(hm.keyboard_layout.keys);
        }
        lastKeyCount = keyCount;
        lastClickCount = clickCount;
      } catch {}
    }, 1000);

    return () => clearInterval(poller);
  }, [dateRange]);

  useEffect(() => {
    GetHeatmapData(dateRange.start, dateRange.end).then(hm => {
      if (hm?.keyboard_layout?.keys) setHeatmapKeys(hm.keyboard_layout.keys);
    }).catch(() => {});
  }, [dateRange]);

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
        <div className="w-full max-w-md dot-grid-subtle" style={{ borderRadius: 12, padding: 24 }}>
          <div className="text-center mb-8">
            <h2 className="page-title mb-2">{t('setup.title', lang)}</h2>
            <p className="page-subtitle">{t('setup.subtitle', lang)}</p>
          </div>

          <div className="space-y-3 mb-8">
            {[
              { n: 1, title: t('setup.step1Title', lang), desc: t('setup.step1Desc', lang) },
              { n: 2, title: t('setup.step2Title', lang), desc: t('setup.step2Desc', lang) },
              { n: 3, title: t('setup.step3Title', lang), desc: t('setup.step3Desc', lang) },
            ].map(step => (
              <div key={step.n} className="card p-4" style={{ borderRadius: 8 }}>
                <div className="flex items-start gap-3">
                  <span className="label label-accent" style={{ marginTop: 2 }}>{step.n}</span>
                  <div>
                    <div className="text-body" style={{ marginBottom: 2 }}>{step.title}</div>
                    <div className="text-body-sm">{step.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => BrowserOpenURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')}
              className="btn-base btn-primary"
              style={{ width: '100%' }}>
              {t('setup.openSettings', lang)}
            </button>
            <button
              onClick={handleStartMonitor}
              disabled={startingMonitor}
              className="btn-base btn-secondary"
              style={{ width: '100%' }}>
              {startingMonitor ? t('setup.checking', lang) : t('setup.startMonitor', lang)}
            </button>
          </div>

          {configInfo && (
            <div className="mt-6">
              <div className="section-title">{t('setup.configTitle', lang)}</div>
              <div className="text-body-sm">
                {t('setup.configDesc', lang)
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
        <div className="loading-text flex items-center gap-3">[LOADING...]<SegmentedSpinner /></div>
      </div>
    );
  }

  // No data
  if (!summary) {
    return (
      <div className="empty-state" style={{ minHeight: '50vh' }}>
        <div className="empty-state-dotgrid" />
        <div className="text-center" style={{ zIndex: 1 }}>
          <div className="text-body" style={{ marginBottom: 4 }}>
            {t('dash.noData', lang)}
          </div>
          <div className="text-body-sm" style={{ marginBottom: 16 }}>
            {t('dash.noDataDesc', lang)}
          </div>
        </div>
        {!monitorRunning && (
          <button
            onClick={handleStartMonitor}
            disabled={startingMonitor}
            className="btn-base btn-sm btn-secondary"
            style={{ zIndex: 1 }}>
            {startingMonitor ? t('setup.checking', lang) : t('setup.startMonitor', lang)}
          </button>
        )}
      </div>
    );
  }

  // Weekly report view
  if (showWeekly) {
    return (
      <div key="weekly" style={{ animation: 'keyfadeIn 0.2s ease-out' }}>
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
  };

  return (
    <div key="main" className="dot-grid-subtle" style={{ animation: 'keyfadeIn 0.2s ease-out', borderRadius: 12, padding: 24 }}>
      {/* Header — bracket nav style */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="page-title">{titleLabel}</h2>
          <div className="mt-1">
            <span className="label" style={{ color: isToday ? 'var(--text-secondary)' : 'var(--accent)' }}>
              {dateLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector — bracket nav */}
          <div className="bracket-nav">
            {[
              { label: t('dash.today', lang), days: 0 },
              { label: t('dash.7d', lang), days: 7 },
              { label: t('dash.30d', lang), days: 30 },
            ].map((p, i) => (
              <span key={p.days} className="flex items-center gap-3">
                {i > 0 && <span style={{ color: 'var(--text-disabled)' }}>·</span>}
                <button
                  onClick={() => applyPreset(p.days)}
                  style={{
                    color: daysDiff === (p.days || 1) && (p.days === 0 ? isToday : true)
                      ? 'var(--text-display)'
                      : 'var(--text-secondary)',
                  }}>
                  [{p.label}]
                </button>
              </span>
            ))}
          </div>
          <button onClick={() => setShowWeekly(true)}
            className="btn-base btn-sm btn-secondary">
            {t('dash.weeklyReport', lang)}
          </button>
        </div>
      </div>

      {/* Stats — 4 hero numbers in a row */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <StatCard
          label={t('dash.keys', lang)}
          value={summary.total_keys.toLocaleString()}
          delta={yesterdayKeys > 0 ? Math.round((summary.total_keys - yesterdayKeys) / yesterdayKeys * 100) : undefined}
        />
        <StatCard
          label={t('dash.wpm', lang)}
          value={currentWpm != null && currentWpm > 0 ? currentWpm.toFixed(0) : '—'}
        />
        <StatCard
          label={t('dash.active', lang)}
          value={formatMinutes(summary.active_minutes)}
        />
        <StatCard
          label={t('dash.clicks', lang)}
          value={summary.mouse_click_count.toLocaleString()}
        />
      </div>

      {/* Active time — segmented progress bar */}
      <div className="mb-8 pb-8" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="label">{t('dash.active', lang)}</span>
          <span className="label" style={{ color: 'var(--text-primary)' }}>
            {formatMinutes(summary.active_minutes)}
            <span style={{ color: 'var(--text-disabled)', marginLeft: 4 }}>/ {daysDiff === 1 ? '24h' : `${daysDiff}d`}</span>
          </span>
        </div>
        <SegmentedBar
          value={summary.active_minutes}
          max={daysDiff * 1440}
          segments={24}
          status={summary.active_minutes > daysDiff * 720 ? 'warning' : 'default'}
        />
      </div>

      {/* Top Apps — flat list with dividers */}
      {topApps.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">{t('dash.topApps', lang)}</h3>
          <div>
            {topApps.map((app, i) => {
              const maxMin = topApps[0]?.minutes || 1;
              const ratio = app.minutes / maxMin;
              return (
                <div key={app.app}
                  className="list-row"
                  style={{ opacity: i === 0 ? 1 : 0.4 + 0.6 * ratio }}>
                  <span className="text-body" style={{
                    fontSize: 13,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {app.app}
                  </span>
                  <span className="badge badge-accent">{app.minutes}m</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Typing ECG */}
      <div className="mb-8">
        <TypingECG dateRange={dateRange} lang={lang} dataVersion={dataVersion} currentWpm={currentWpm} peakWpm={peakWpm} />
      </div>

      {/* Keyboard Heatmap */}
      {heatmapKeys.length > 0 && (
        <div className="mb-8">
          <KeyboardHeatmap keys={heatmapKeys} />
        </div>
      )}

      {/* Top Keys — Bar list */}
      {(summary.top_keys?.length ?? 0) > 0 && (
        <div>
          <h3 className="section-title">{t('dash.topKeys', lang)}</h3>
          {(summary.top_keys ?? []).slice(0, 10).map((k, i) => {
            const maxCount = summary.top_keys![0].count || 1;
            const pct = (k.count / maxCount) * 100;
            return (
              <div key={k.key} className="topkey-bar-row"
                style={{ opacity: i === 0 ? 1 : 0.4 + 0.6 * (k.count / maxCount) }}>
                <span className="topkey-bar-label">{formatKeyName(k.key)}</span>
                <div className="topkey-bar-track">
                  <div className="topkey-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="topkey-bar-count">{k.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
