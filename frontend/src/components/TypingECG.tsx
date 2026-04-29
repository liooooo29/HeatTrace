import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { t } from '../i18n';
import type { Lang } from '../i18n';

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
  peakWpm?: number;
  wpmHistory?: { wpm: number; time: number }[];
}

export function TypingECG({ lang, currentWpm, peakWpm, wpmHistory }: TypingECGProps) {
  const displayWpm = currentWpm ?? 0;
  const displayPeak = peakWpm ?? 0;

  const chartData = useMemo(() => {
    if (!wpmHistory || wpmHistory.length === 0) return [];
    return wpmHistory.map(s => ({
      wpm: s.wpm,
      label: new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));
  }, [wpmHistory]);

  if (chartData.length === 0) {
    return (
      <div className="chart-card flex items-center justify-center dot-grid-subtle"
        style={{ color: 'var(--text-disabled)', fontSize: 13, minHeight: 192, borderRadius: 12 }}>
        {t('report.noRhythm', lang)}
      </div>
    );
  }

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
            {t('report.heartRate', lang)}: {displayWpm} WPM
          </span>
        </div>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: 'var(--text-disabled)',
        }}>
          {t('report.peak', lang)}: {displayPeak} WPM
        </span>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
            <XAxis dataKey="label"
              tick={{ fill: 'var(--text-disabled)', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 6))} />
            <YAxis tick={{ fill: 'var(--text-disabled)', fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value} WPM`, '']}
              labelFormatter={(label: string) => `${label}`} />
            <Line type="monotone" dataKey="wpm"
              stroke="var(--accent)" strokeWidth={1.5}
              dot={false} activeDot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
