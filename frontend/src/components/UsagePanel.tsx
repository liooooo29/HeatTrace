import { useEffect, useState } from 'react';
import { GetUsageTime } from '../wails-bindings';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { UsageTime } from '../types';

const PIE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface UsagePanelProps {
  dateRange: { start: string; end: string };
}

export function UsagePanel({ dateRange }: UsagePanelProps) {
  const [data, setData] = useState<UsageTime | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await GetUsageTime(dateRange.start, dateRange.end);
        setData(result);
      } catch (e) {
        console.error('Failed to load usage data:', e);
      }
    }
    load();
  }, [dateRange]);

  if (!data) return (
    <div>
      <div className="mb-6"><h2 className="page-title">Usage</h2></div>
      <div className="grid grid-cols-2 gap-4 mb-6">{[1,2].map(i => <div key={i} className="skeleton h-24" />)}</div>
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
        <h2 className="page-title">Usage</h2>
        <p className="page-subtitle">Active time and application usage</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))' }} />
          <div className="stat-value">{formatMinutes(data.total_minutes)}</div>
          <div className="stat-label">Total active</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 50%, transparent))' }} />
          <div className="stat-value">{data.app_usage.length}</div>
          <div className="stat-label">Active apps</div>
        </div>
      </div>

      {data.daily_usage.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">Daily Usage</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily_usage}>
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMinutes(value)} cursor={{ fill: 'var(--surface)' }} />
                  <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {data.app_usage.length > 0 && (
        <div>
          <h3 className="section-title">App Usage</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.app_usage} dataKey="minutes" nameKey="app" cx="50%" cy="50%" outerRadius={80}
                    label={({ app, percent }) => `${app} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: 'var(--muted)' }}>
                    {data.app_usage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
