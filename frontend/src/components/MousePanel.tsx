import { useEffect, useState } from 'react';
import { GetMouseStats, GetHeatmapData } from '../wails-bindings';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MouseHeatmap } from './MouseHeatmap';
import type { MouseStats, MouseHeatPoint } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface MousePanelProps {
  dateRange: { start: string; end: string };
}

export function MousePanel({ dateRange }: MousePanelProps) {
  const [stats, setStats] = useState<MouseStats | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<MouseHeatPoint[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [data, hm] = await Promise.all([
          GetMouseStats(dateRange.start, dateRange.end),
          GetHeatmapData(dateRange.start, dateRange.end),
        ]);
        setStats(data);
        if (hm?.mouse_heatmap?.points) setHeatmapPoints(hm.mouse_heatmap.points);
      } catch (e) {
        console.error('Failed to load mouse stats:', e);
      }
    }
    load();
  }, [dateRange]);

  if (!stats) return (
    <div>
      <div className="mb-6"><h2 className="page-title">Mouse</h2></div>
      <div className="grid grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}</div>
      <div className="skeleton h-48" />
    </div>
  );

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`;

  return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">Mouse</h2>
        <p className="page-subtitle">Click distribution and movement tracking</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))' }} />
          <div className="stat-value">{stats.total_clicks.toLocaleString()}</div>
          <div className="stat-label">Total clicks</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 50%, transparent))' }} />
          <div className="stat-value">{formatDistance(stats.total_distance_meters)}</div>
          <div className="stat-label">Distance</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))' }} />
          <div className="stat-value">{stats.left_clicks.toLocaleString()}</div>
          <div className="stat-label">Left clicks</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--amber), color-mix(in srgb, var(--amber) 50%, transparent))' }} />
          <div className="stat-value">{stats.right_clicks.toLocaleString()}</div>
          <div className="stat-label">Right clicks</div>
        </div>
      </div>

      {stats.daily_distance.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">Daily Distance</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.daily_distance}>
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

      {heatmapPoints.length > 0 && (
        <div>
          <h3 className="section-title">Click & Move Heatmap</h3>
          <MouseHeatmap points={heatmapPoints} />
        </div>
      )}
    </div>
  );
}
