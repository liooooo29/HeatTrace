import { useEffect, useState } from 'react';
import { GetKeyboardStats, GetHeatmapData } from '../wails-bindings';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { KeyboardHeatmap } from './KeyboardHeatmap';
import type { KeyboardStats, KeyHeatPoint } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface KeyboardPanelProps {
  dateRange: { start: string; end: string };
}

export function KeyboardPanel({ dateRange }: KeyboardPanelProps) {
  const [stats, setStats] = useState<KeyboardStats | null>(null);
  const [heatmapKeys, setHeatmapKeys] = useState<KeyHeatPoint[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [data, hm] = await Promise.all([
          GetKeyboardStats(dateRange.start, dateRange.end),
          GetHeatmapData(dateRange.start, dateRange.end),
        ]);
        setStats(data);
        if (hm?.keyboard_layout?.keys) setHeatmapKeys(hm.keyboard_layout.keys);
      } catch (e) {
        console.error('Failed to load keyboard stats:', e);
      }
    }
    load();
  }, [dateRange]);

  if (!stats) return (
    <div>
      <div className="mb-6"><h2 className="page-title">Keyboard</h2></div>
      <div className="grid grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      <div className="skeleton h-48" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">Keyboard</h2>
        <p className="page-subtitle">Key usage frequency and patterns</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent))' }} />
          <div className="stat-value">{stats.total_keys.toLocaleString()}</div>
          <div className="stat-label">Total keys</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--amber), color-mix(in srgb, var(--amber) 50%, transparent))' }} />
          <div className="stat-value">{stats.filtered_keys.toLocaleString()}</div>
          <div className="stat-label">Filtered</div>
        </div>
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 50%, transparent))' }} />
          <div className="stat-value">{stats.mod_combos.length}</div>
          <div className="stat-label">Key combos</div>
        </div>
      </div>

      {/* Modifier Combos */}
      {stats.mod_combos.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">Modifier Combos</h3>
          <div className="flex flex-wrap gap-2">
            {stats.mod_combos.slice(0, 12).map(c => (
              <div key={c.combo} className="badge badge-accent" style={{ gap: 6, padding: '5px 10px', borderRadius: 8 }}>
                <span style={{ fontWeight: 600 }}>{c.combo}</span>
                <span style={{ opacity: 0.7 }}>{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Heatmap */}
      {heatmapKeys.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">Key Heatmap</h3>
          <KeyboardHeatmap keys={heatmapKeys} />
        </div>
      )}

      {stats.key_frequency.length > 0 && (
        <div className="mb-8">
          <h3 className="section-title">Top 20 Keys</h3>
          <div className="chart-card">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.key_frequency} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="key" type="category" width={50} tick={{ fill: 'var(--fg)', fontSize: 12, fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.key_frequency.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, transparent)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {stats.hourly_keys.length > 0 && (
        <div>
          <h3 className="section-title">Activity by Hour</h3>
          <div className="chart-card">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourly_keys}>
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
    </div>
  );
}
