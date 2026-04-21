import { useEffect, useState } from 'react';
import { GetKeyboardStats, GetMouseStats, GetHeatmapData, GetKeyCount, GetMouseClickCount } from '../wails-bindings';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { KeyboardHeatmap } from './KeyboardHeatmap';
import { MouseHeatmap } from './MouseHeatmap';
import { MouseTrail } from './MouseTrail';
import { ErrorPage } from './ErrorPage';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { KeyboardStats, KeyHeatPoint, MouseStats, MouseHeatPoint } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface ActivityPanelProps {
  dateRange: { start: string; end: string };
  lang: Lang;
}

const KEY_DISPLAY: Record<string, string> = {
  ' ': 'Space', 'Backspace': '⌫', 'Tab': '⇥', 'Enter': '↵',
  'Esc': 'Esc', 'Caps': '⇪', 'Shift': '⇧', 'Ctrl': '⌃',
  'Opt': '⌥', 'Cmd': '⌘', 'Delete': 'Del',
};

function fmtKey(key: string): string {
  return KEY_DISPLAY[key] || (key.length === 1 ? key.toUpperCase() : key);
}

export function ActivityPanel({ dateRange, lang }: ActivityPanelProps) {
  const [keyStats, setKeyStats] = useState<KeyboardStats | null>(null);
  const [mouseStats, setMouseStats] = useState<MouseStats | null>(null);
  const [heatmapKeys, setHeatmapKeys] = useState<KeyHeatPoint[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<MouseHeatPoint[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Heatmap data — load once per date change (cumulative)
  useEffect(() => {
    GetHeatmapData(dateRange.start, dateRange.end).then(hm => {
      if (hm?.keyboard_layout?.keys) setHeatmapKeys(hm.keyboard_layout.keys);
      if (hm?.mouse_heatmap?.points) setHeatmapPoints(hm.mouse_heatmap.points);
    }).catch(() => {});
  }, [dateRange]);

  // Stats data — fast refresh on key/click events
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function loadStats() {
      try {
        const [ks, ms] = await Promise.all([
          GetKeyboardStats(dateRange.start, dateRange.end),
          GetMouseStats(dateRange.start, dateRange.end),
        ]);
        setError('');
        setKeyStats(ks);
        setMouseStats(ms);
        setLoaded(true);
      } catch (e) {
        console.error('Failed to load activity data:', e);
        setError(e instanceof Error ? e.message : String(e));
        setLoaded(true);
      }
    }
    loadStats();
    timer = setInterval(loadStats, 5000);
    let lastKeyCount = -1;
    const keyTimer = setInterval(async () => {
      try {
        const count = await GetKeyCount();
        if (count !== lastKeyCount) {
          if (lastKeyCount >= 0) loadStats();
          lastKeyCount = count;
        }
      } catch {}
    }, 200);
    let lastClickCount = -1;
    const clickTimer = setInterval(async () => {
      try {
        const count = await GetMouseClickCount();
        if (count !== lastClickCount) {
          if (lastClickCount >= 0) loadStats();
          lastClickCount = count;
        }
      } catch {}
    }, 500);
    return () => {
      clearInterval(timer);
      clearInterval(keyTimer);
      clearInterval(clickTimer);
    };
  }, [dateRange]);

  if (error && loaded && !keyStats) return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">{t('act.title', lang)}</h2>
        <p className="page-subtitle">{t('act.subtitle', lang)}</p>
      </div>
      <ErrorPage message={t('error.loadFailed', lang)} details={error} lang={lang}
        onRetry={() => { setLoaded(false); setError(''); }} />
    </div>
  );

  if (!keyStats || !mouseStats) return (
    <div>
      <div className="mb-6"><h2 className="page-title">{t('act.title', lang)}</h2></div>
      <div className="grid grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}</div>
      <div className="skeleton h-48" />
    </div>
  );

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`;

  return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">{t('act.title', lang)}</h2>
        <p className="page-subtitle">{t('act.subtitle', lang)}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-border))' }} />
          <div className="stat-value">{keyStats.total_keys.toLocaleString()}</div>
          <div className="stat-label">{t('act.totalKeys', lang)}</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--green), var(--green-border))' }} />
          <div className="stat-value">{mouseStats.total_clicks.toLocaleString()}</div>
          <div className="stat-label">{t('act.clicks', lang)}</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--amber), var(--amber-bg))' }} />
          <div className="stat-value">{formatDistance(mouseStats.total_distance_meters)}</div>
          <div className="stat-label">{t('act.distance', lang)}</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-border))' }} />
          <div className="stat-value">{keyStats.mod_combos.length}</div>
          <div className="stat-label">{t('act.combos', lang)}</div>
        </div>
      </div>

      {keyStats.mod_combos.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">{t('act.modCombos', lang)}</h3>
          <div className="flex flex-wrap gap-2">
            {keyStats.mod_combos.slice(0, 12).map(c => (
              <div key={c.combo} className="badge badge-accent" style={{ gap: 6, padding: '5px 10px', borderRadius: 8 }}>
                <span style={{ fontWeight: 600 }}>{c.combo}</span>
                <span style={{ opacity: 0.7 }}>{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {heatmapKeys.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">{t('act.keyHeatmap', lang)}</h3>
          <KeyboardHeatmap keys={heatmapKeys} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        {keyStats.key_frequency.length > 0 && (() => {
          const topKeys = keyStats.key_frequency.slice(0, 12).map(k => ({ ...k, label: fmtKey(k.key) }));
          return (
          <div>
            <h3 className="section-title">{t('act.topKeys', lang)}</h3>
            <div className="chart-card">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topKeys} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="label" type="category" width={46} tick={{ fill: 'var(--fg)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {topKeys.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'var(--accent)' : 'var(--accent-bg)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          );
        })()}
        {mouseStats.daily_distance.length > 0 && (
          <div>
            <h3 className="section-title">{t('act.mouseDistance', lang)}</h3>
            <div className="chart-card">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mouseStats.daily_distance}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="distance" stroke="var(--green)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {keyStats.hourly_keys.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">{t('act.hourlyActivity', lang)}</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={keyStats.hourly_keys}>
                  <XAxis dataKey="hour" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface)' }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="section-title">{t('act.mouseTrail', lang)}</h3>
        <MouseTrail lang={lang} />
      </div>

      {heatmapPoints.length > 0 && (
        <div>
          <h3 className="section-title">{t('act.clickHeatmap', lang)}</h3>
          <MouseHeatmap points={heatmapPoints} />
        </div>
      )}
    </div>
  );
}
