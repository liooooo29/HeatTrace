import { useMemo } from 'react';
import type { DailyGridCell } from '../types';

interface WeeklyHeatmapProps {
  grid: DailyGridCell[];
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyHeatmap({ grid }: WeeklyHeatmapProps) {
  const { cells, maxVal } = useMemo(() => {
    const cellMap = new Map<string, number>();
    let max = 0;
    for (const c of grid) {
      cellMap.set(`${c.date}_${c.hour}`, c.value);
      if (c.value > max) max = c.value;
    }
    return { cells: cellMap, maxVal: max };
  }, [grid]);

  const dates = useMemo(() => {
    const seen = new Set<string>();
    return grid.filter(c => {
      if (seen.has(c.date)) return false;
      seen.add(c.date);
      return true;
    }).map(c => c.date);
  }, [grid]);

  if (dates.length === 0) return null;

  return (
    <div className="chart-card p-4">
      <div className="flex">
        {/* Hour labels */}
        <div className="flex flex-col mr-2" style={{ width: 28 }}>
          <div style={{ height: 18 }} />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex items-center justify-end pr-1"
              style={{ height: 14, fontSize: 9, color: 'var(--muted-2)', fontFamily: 'Fira Code' }}>
              {h % 6 === 0 ? `${h}` : ''}
            </div>
          ))}
        </div>
        {/* Day columns */}
        {dates.map((date) => {
          const dow = new Date(date + 'T00:00:00').getDay();
          const dowLabel = DOW_LABELS[dow === 0 ? 6 : dow - 1];
          return (
            <div key={date} className="flex-1">
              <div className="text-center mb-1" style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'Fira Code', height: 18 }}>
                {dowLabel}
              </div>
              <div className="flex flex-col gap-px">
                {Array.from({ length: 24 }, (_, h) => {
                  const val = cells.get(`${date}_${h}`) || 0;
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  return (
                    <div key={h}
                      style={{
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: intensity > 0
                          ? `color-mix(in srgb, var(--accent) ${Math.round(intensity * 80 + 5)}%, var(--surface))`
                          : 'var(--surface)',
                      }}
                      title={`${date} ${h}:00 — ${Math.round(val * 100)}% activity`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
