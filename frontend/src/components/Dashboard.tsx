import { useEffect, useState, useCallback } from 'react';
import { GetDailySummary, GetKeyboardStats, GetMouseStats, GetTypingSpeed, GetUsageTime, BrowserOpenURL, ToggleMonitor, GetConfig, GetMonitorStatus } from '../wails-bindings';
import { StatCard } from './StatCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { DailySummary } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 11,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

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
}

export function Dashboard({ dateRange, lang, monitorRunning, accessErr, onMonitorChange }: DashboardProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyTrend, setKeyTrend] = useState<any[]>([]);
  const [mouseTrend, setMouseTrend] = useState<any[]>([]);
  const [typingTrend, setTypingTrend] = useState<any[]>([]);
  const [usageTrend, setUsageTrend] = useState<any[]>([]);
  const [startingMonitor, setStartingMonitor] = useState(false);
  const [configInfo, setConfigInfo] = useState<any>(null);

  useEffect(() => {
    GetConfig().then(c => { if (c) setConfigInfo(c); }).catch(() => {});
  }, []);

  // Data loading — always runs
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function load(showLoading = false) {
      if (showLoading) setLoading(true);
      try {
        const end = dateRange.end;
        const d = new Date(dateRange.end);
        d.setDate(d.getDate() - 6);
        const start = dateRange.start === dateRange.end
          ? d.toISOString().slice(0, 10)
          : dateRange.start;

        const [data, ks, ms, ts, us] = await Promise.all([
          GetDailySummary(end),
          GetKeyboardStats(start, end),
          GetMouseStats(start, end),
          GetTypingSpeed(start, end),
          GetUsageTime(start, end),
        ]);
        setSummary(data);
        if (ks?.hourly_keys) {
          const daily = ks.hourly_keys.reduce((acc: any[], h: any) => {
            const existing = acc.find((d: any) => d.hour === h.hour);
            if (existing) existing.count += h.count;
            else acc.push({ hour: `${h.hour}h`, count: h.count });
            return acc;
          }, []);
          setKeyTrend(daily);
        }
        if (ms?.daily_distance) setMouseTrend(ms.daily_distance);
        if (ts?.daily_speed) setTypingTrend(ts.daily_speed);
        if (us?.daily_usage) setUsageTrend(us.daily_usage);
      } catch (e) {
        console.error('Failed to load summary:', e);
      } finally {
        if (showLoading) setLoading(false);
      }
    }
    load(true);
    timer = setInterval(() => load(false), 5000);
    return () => clearInterval(timer);
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
              style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--green) 30%))' }}>
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
                  style={{ backgroundColor: 'var(--accent-muted)' }}>
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
                backgroundColor: startingMonitor ? 'var(--surface-2)' : 'var(--green-muted)',
                color: 'var(--green)',
                border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
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
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-muted)' }}>
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

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`;
  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  const hasPreviewCharts = keyTrend.length > 0 || mouseTrend.length > 0 || typingTrend.length > 0 || usageTrend.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">{t('dash.title', lang)}</h2>
        <p className="page-subtitle">{t('dash.subtitle', lang)}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label={t('dash.keys', lang)}
          value={summary.total_keys.toLocaleString()}
          color="var(--accent)"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8"/></svg>}
        />
        <StatCard
          label={t('dash.distance', lang)}
          value={formatDistance(summary.mouse_distance_meters)}
          color="var(--green)"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>}
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

      {hasPreviewCharts && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {keyTrend.length > 0 && (
            <div className="chart-card">
              <div className="section-title">{t('dash.keyActivity', lang)}</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={keyTrend}>
                    <XAxis dataKey="hour" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface)' }} />
                    <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {mouseTrend.length > 0 && (
            <div className="chart-card">
              <div className="section-title">{t('dash.mouseDistance', lang)}</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mouseTrend}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="distance" stroke="var(--green)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {typingTrend.length > 0 && (
            <div className="chart-card">
              <div className="section-title">{t('dash.typingSpeed', lang)}</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={typingTrend}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="wpm" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {usageTrend.length > 0 && (
            <div className="chart-card">
              <div className="section-title">{t('dash.dailyUsage', lang)}</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageTrend}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${value}m`} cursor={{ fill: 'var(--surface)' }} />
                    <Bar dataKey="minutes" fill="var(--amber)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {summary.top_keys.length > 0 && (
        <div>
          <h3 className="section-title">{t('dash.topKeys', lang)}</h3>
          <div className="flex flex-wrap gap-2">
            {summary.top_keys.slice(0, 10).map((k, i) => {
              const maxCount = summary.top_keys[0]?.count || 1;
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
  );
}
