import { useEffect, useState, useRef } from 'react';
import { GetTypingRhythm } from '../wails-bindings';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { RhythmPoint } from '../types';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--fg)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

interface TypingECGProps {
  dateRange: { start: string; end: string };
  lang: Lang;
}

export function TypingECG({ dateRange, lang }: TypingECGProps) {
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
          // Single day: show hourly rhythm
          const dayData = result
            .map((d: RhythmPoint) => ({ ...d, label: d.time.slice(11, 16) }));
          setData(dayData);
        } else if (!isSingleDay) {
          // Multi-day: build map from result, then fill ALL days in range
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
          // Generate all days in range
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
  }, [dateRange, lang]);

  // Animate the ECG line sweeping in
  useEffect(() => {
    if (data.length === 0) return;
    setVisibleCount(0);
    let count = 0;
    const step = () => {
      count += 3;
      if (count >= data.length) {
        setVisibleCount(data.length);
        // After initial sweep, show full with scrolling effect
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
    return <div className="skeleton h-48" />;
  }

  if (data.length === 0) {
    return (
      <div className="chart-card p-8 flex items-center justify-center"
        style={{ color: 'var(--muted)', fontSize: 13, minHeight: 192 }}>
        {t('report.noRhythm', lang)}
      </div>
    );
  }

  const visibleData = data.slice(0, Math.max(visibleCount, data.length));
  const avgCPM = data.reduce((sum, d) => sum + d.cpm, 0) / data.length;
  const maxCPM = Math.max(...data.map(d => d.cpm));

  // Find peaks and valleys for annotations
  const peakCPM = maxCPM;
  const peakIdx = data.findIndex(d => d.cpm === peakCPM);

  return (
    <div className="chart-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* ECG glow effect behind chart */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 80%, var(--glow) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: 'var(--green)',
            boxShadow: '0 0 8px var(--green-bg)',
            animation: 'ecg-pulse 1.5s ease-in-out infinite',
          }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--green)' }}>
            {t('report.heartRate', lang)}: {avgCPM.toFixed(0)} CPM
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>
          {t('report.peak', lang)}: {maxCPM.toFixed(0)} CPM
        </span>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
            <defs>
              <filter id="ecg-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <XAxis dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }}
              axisLine={false} tickLine={false}
              interval={Math.max(0, Math.floor(data.length / 8))} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'Fira Code' }}
              axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value.toFixed(0)} CPM`, '']}
              labelFormatter={(label: string) => `${label}`} />
            {avgCPM > 0 && (
              <ReferenceLine y={avgCPM} stroke="var(--green-border)" strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Line type="monotone" dataKey="cpm"
              stroke="var(--green)" strokeWidth={2}
              dot={false} activeDot={{ r: 4, fill: 'var(--green)', stroke: 'var(--bg)', strokeWidth: 2 }}
              filter="url(#ecg-glow)"
              isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Peak annotation */}
      {peakIdx >= 0 && peakIdx < visibleData.length && (
        <div className="absolute pointer-events-none" style={{
          top: 42, right: 24,
          fontSize: 9, color: 'var(--green)', opacity: 0.7,
          fontFamily: 'Fira Code',
        }}>
          ↑ {t('report.codingBurst', lang)}
        </div>
      )}
    </div>
  );
}
