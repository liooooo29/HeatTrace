import { useEffect, useState } from 'react';
import { GetTypingSpeed, GetUsageTime, GetKeyCount } from '../wails-bindings';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ErrorPage } from './ErrorPage';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { TypingSpeed, UsageTime } from '../types';

const PIE_COLORS = ['#F59E0B', '#34D399', '#F97316', '#A78BFA', '#F472B6', '#06B6D4'];

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface TypingPanelProps {
  dateRange: { start: string; end: string };
  lang: Lang;
}

export function TypingPanel({ dateRange, lang }: TypingPanelProps) {
  const [typing, setTyping] = useState<TypingSpeed | null>(null);
  const [usage, setUsage] = useState<UsageTime | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function load() {
      try {
        const [ts, us] = await Promise.all([
          GetTypingSpeed(dateRange.start, dateRange.end),
          GetUsageTime(dateRange.start, dateRange.end),
        ]);
        setError('');
        setTyping(ts ? {
          average_cpm: ts.average_cpm || 0,
          average_wpm: ts.average_wpm || 0,
          daily_speed: ts.daily_speed || [],
          hourly_speed: ts.hourly_speed || [],
        } : { average_cpm: 0, average_wpm: 0, daily_speed: [], hourly_speed: [] });
        setUsage(us ? {
          total_minutes: us.total_minutes || 0,
          daily_usage: us.daily_usage || [],
          app_usage: us.app_usage || [],
        } : { total_minutes: 0, daily_usage: [], app_usage: [] });
      } catch (e) {
        console.error('Failed to load typing/usage data:', e);
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    timer = setInterval(load, 5000);
    let lastKeyCount = -1;
    const keyTimer = setInterval(async () => {
      try {
        const count = await GetKeyCount();
        if (count !== lastKeyCount) {
          if (lastKeyCount >= 0) load();
          lastKeyCount = count;
        }
      } catch {}
    }, 200);
    return () => {
      clearInterval(timer);
      clearInterval(keyTimer);
    };
  }, [dateRange]);

  if (error && !typing) return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">{t('prod.title', lang)}</h2>
        <p className="page-subtitle">{t('prod.subtitle', lang)}</p>
      </div>
      <ErrorPage message={t('error.loadFailed', lang)} details={error} lang={lang}
        onRetry={() => setError('')} />
    </div>
  );

  if (!typing || !usage) return (
    <div>
      <div className="mb-6"><h2 className="page-title">{t('prod.title', lang)}</h2></div>
      <div className="grid grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}</div>
      <div className="skeleton h-48" />
    </div>
  );

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">{t('prod.title', lang)}</h2>
        <p className="page-subtitle">{t('prod.subtitle', lang)}</p>
      </div>

      {error && (
        <div className="mb-4 text-xs px-3 py-2.5 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>
          <span>{t('error.loadFailed', lang)}: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-border))' }} />
          <div className="stat-value">{typing.average_cpm.toFixed(0)}</div>
          <div className="stat-label">{t('prod.avgCpm', lang)}</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--green), var(--green-border))' }} />
          <div className="stat-value">{typing.average_wpm.toFixed(0)}</div>
          <div className="stat-label">{t('prod.avgWpm', lang)}</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--amber), var(--amber-bg))' }} />
          <div className="stat-value">{formatMinutes(usage.total_minutes)}</div>
          <div className="stat-label">{t('prod.active', lang)}</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-border))' }} />
          <div className="stat-value">{usage.app_usage.length}</div>
          <div className="stat-label">{t('prod.apps', lang)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {typing.daily_speed.length > 0 && (
          <div>
            <h3 className="section-title">{t('prod.dailyWpm', lang)}</h3>
            <div className="chart-card">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={typing.daily_speed}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="wpm" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {usage.daily_usage.length > 0 && (
          <div>
            <h3 className="section-title">{t('prod.dailyUsage', lang)}</h3>
            <div className="chart-card">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usage.daily_usage}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMinutes(value)} cursor={{ fill: 'var(--surface)' }} />
                    <Bar dataKey="minutes" fill="var(--amber)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {typing.hourly_speed.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">{t('prod.speedByHour', lang)}</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={typing.hourly_speed}>
                  <XAxis dataKey="hour" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="cpm" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {usage.app_usage.length > 0 && (
        <div>
          <h3 className="section-title">{t('prod.appUsage', lang)}</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={usage.app_usage} dataKey="minutes" nameKey="app" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: 'var(--muted)' }}>
                    {usage.app_usage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMinutes(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
