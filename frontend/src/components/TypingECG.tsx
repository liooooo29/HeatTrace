import { useEffect, useState, useRef } from 'react';
import { GetTypingRhythm } from '../wails-bindings';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { RhythmPoint } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border-visible)',
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "'Space Mono', monospace",
  color: 'var(--text-primary)',
};

interface TypingECGProps {
  dateRange: { start: string; end: string };
  lang: Lang;
  dataVersion?: number;
  currentWpm?: number;
}

export function TypingECG({ dateRange, lang, dataVersion, currentWpm }: TypingECGProps) {
  const [data, setData] = useState<(RhythmPoint & { label: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const animRef = useRef<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const result = await GetTypingRhythm(dateRange.start, dateRange.end);
        const isSingleDay = dateRange.start === dateRange.end;
        if (isSingleDay && result && result.length > 0) {
          const dayData = result
            .map((d: RhythmPoint) => ({ ...d, label: d.time.slice(11, 16) }));
          setData(dayData);
        } else if (!isSingleDay) {
          const byDate = new Map<string, number>();
          if (result) {
            const dailyTotals = new Map<string, { total: number; count: number }>();
            for (const d of result) {
              const date = d.time.slice(0, 10);
              const entry = dailyTotals.get(date) || { total: 0, count: 0 };
              entry.total += d.cpm;
              entry.count++;
              dailyTotals.set(date, entry);
            }
            for (const [date, v] of dailyTotals) {
              byDate.set(date, Math.round(v.total / v.count));
            }
          }
          const allDays: (RhythmPoint & { label: string })[] = [];
          const start = new Date(dateRange.start + 'T00:00:00');
          const end = new Date(dateRange.end + 'T00:00:00');
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            allDays.push({
              time: dateStr,
              cpm: byDate.get(dateStr) || 0,
              keys: 0,
              label: d.toLocaleDateString(
                lang === 'zh' ? 'zh-CN' : 'en-US',
                { month: 'short', day: 'numeric' }
              ),
            });
          }
          setData(allDays);
        } else {
          setData([]);
        }
        setVisibleCount(0);
      } catch {
        setData([]);
      }
      setLoading(false);
    }
    load();
  }, [dateRange, lang, dataVersion]);

  // Animate line sweeping in
  useEffect(() => {
    if (data.length === 0) return;
    setVisibleCount(0);
    let count = 0;
    const step = () => {
      count += 3;
      if (count >= data.length) {
        setVisibleCount(data.length);
        return;
      }
      setVisibleCount(count);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [data]);

  if (loading) {
    return <div className="loading-text" style={{ height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[LOADING...]</div>;
  }

  if (data.length === 0) {
    return (
      <div className="chart-card flex items-center justify-center dot-grid-subtle"
        style={{ color: 'var(--text-disabled)', fontSize: 13, minHeight: 192, borderRadius: 12 }}>
        {t('report.noRhythm', lang)}
      </div>
    );
  }

  const visibleData = data.slice(0, Math.max(visibleCount, data.length));
  const avgCPM = data.reduce((sum, d) => sum + d.cpm, 0) / data.length;
  const maxCPM = Math.max(...data.map(d => d.cpm));
  const displayWpm = currentWpm != null ? currentWpm : avgCPM / 5;

  return (
    <div className="chart-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            animation: 'ecg-pulse 1.5s ease-in-out infinite',
            transition: 'background-color 1.5s ease',
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--accent)',
            transition: 'color 1.5s ease',
          }}>
            {t('report.heartRate', lang)}: {displayWpm.toFixed(0)} WPM
          </span>
        </div>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: 'var(--text-disabled)',
        }}>
          {t('report.peak', lang)}: {(maxCPM / 5).toFixed(0)} WPM
        </span>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ left: 0, right: 30, top: 5, bottom: 0 }}>
            <XAxis dataKey="label"
              tick={{ fill: 'var(--text-disabled)', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval={Math.max(0, Math.floor(data.length / 8))} />
            <YAxis tick={{ fill: 'var(--text-disabled)', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value: number) => [`${(value / 5).toFixed(0)} WPM`, '']}
              labelFormatter={(label: string) => `${label}`} />
            {avgCPM > 0 && (
              <ReferenceLine y={displayWpm * 5} stroke="var(--text-disabled)" strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Line type="monotone" dataKey="cpm"
              stroke="var(--accent)" strokeWidth={1.5}
              dot={false} activeDot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
