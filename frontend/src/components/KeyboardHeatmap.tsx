import { useMemo } from 'react';
import type { KeyHeatPoint } from '../types';
import type { KeyboardLayout, LayoutRow } from '../data/keyboardLayouts';

const BASE_UNIT = 36; // pixels per flex unit

function getDisplayLabel(key: string): string {
  switch (key) {
    case 'Backspace': return '⌫';
    case 'Tab': return '⇥';
    case 'Caps': return '⇪';
    case 'Enter': return '↵';
    case 'Shift': return '⇧';
    case 'Ctrl': return '⌃';
    case 'Opt': return '⌥';
    case 'Cmd': return '⌘';
    case 'Space': return '';
    default: return key.toUpperCase();
  }
}

// Nothing heatmap: opacity-based accent tint
function getHeatBg(value: number): string {
  if (value <= 0) return 'var(--surface-raised)';
  const opacities = [0.08, 0.18, 0.30, 0.45, 0.62, 0.80];
  const idx = Math.min(Math.floor(value * 6), 5);
  return `color-mix(in srgb, var(--accent) ${Math.round(opacities[idx] * 100)}%, var(--surface-raised))`;
}

function getHeatFg(value: number): { label: string; count: string } {
  if (value <= 0) return { label: 'var(--text-disabled)', count: 'transparent' };
  if (value < 0.3) return { label: 'var(--text-secondary)', count: 'var(--text-disabled)' };
  if (value < 0.6) return { label: 'var(--text-primary)', count: 'var(--accent)' };
  if (value < 0.8) return { label: 'var(--text-display)', count: 'var(--accent)' };
  return { label: 'var(--text-display)', count: 'var(--text-display)' };
}

const KEY_ALIASES: Record<string, string[]> = {
  ' ': ['space'],
  'space': [' '],
  'caps': ['capslock'],
  'capslock': ['caps'],
  'esc': ['escape'],
  'escape': ['esc'],
  'del': ['delete'],
  'delete': ['del'],
  'backspace': ['back'],
  'opt': ['alt'],
  'alt': ['opt'],
  'cmd': ['meta', 'super'],
  'meta': ['cmd', 'super'],
  'super': ['cmd', 'meta'],
};

function KeyCell({ baseKey, shiftedKey, count, value, width }: {
  baseKey: string; shiftedKey?: string; count: number; value: number; width: number;
}) {
  const hasShift = !!shiftedKey && shiftedKey !== baseKey;
  const fg = getHeatFg(value);

  return (
    <div
      className="heatmap-key"
      style={{
        width,
        backgroundColor: getHeatBg(value),
        border: `1px solid ${value > 0.5 ? 'color-mix(in srgb, var(--accent) 20%, var(--border))' : 'var(--border)'}`,
      }}
      title={`${baseKey}${hasShift ? ` / ${shiftedKey}` : ''}: ${count.toLocaleString()}`}
    >
      {hasShift && (
        <span className="heatmap-key-shift" style={{ color: fg.label }}>
          {shiftedKey}
        </span>
      )}
      <span
        className="heatmap-key-base"
        style={{ color: fg.label, fontWeight: value > 0.5 ? 700 : 400 }}
      >
        {baseKey.length > 1 ? getDisplayLabel(baseKey) : baseKey.toUpperCase()}
      </span>
      {count > 0 && (
        <span className="heatmap-key-count" style={{ color: fg.count }}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </div>
  );
}

export function KeyboardHeatmap({ keys, layout }: { keys: KeyHeatPoint[]; layout: KeyboardLayout }) {
  if (!layout) return null;

  const keyMap = useMemo(() => {
    const map = new Map<string, KeyHeatPoint>();
    for (const k of keys) {
      const lower = k.key.toLowerCase();
      map.set(lower, k);
      const aliases = KEY_ALIASES[lower];
      if (aliases) {
        for (const alias of aliases) {
          if (!map.has(alias)) map.set(alias, k);
        }
      }
    }
    return map;
  }, [keys]);

  const maxCount = useMemo(() => Math.max(...keys.map(k => k.count), 1), [keys]);

  const levels = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0];

  const renderRows = (rows: LayoutRow[], prefix: string) =>
    rows.map((row, ri) => (
      <div key={`${prefix}-${ri}`} className="flex gap-0.5">
        {row.map((group, gi) => (
          <div key={gi} className="flex gap-0.5">
            {group.map((keyDef, ki) => {
              const data = keyMap.get(keyDef.label.toLowerCase());
              const count = data?.count || 0;
              const value = count / maxCount;
              const width = Math.round(keyDef.width * BASE_UNIT);
              return (
                <KeyCell
                  key={`${prefix}-${ri}-${gi}-${ki}`}
                  baseKey={keyDef.label}
                  shiftedKey={keyDef.shifted}
                  count={count}
                  value={value}
                  width={width}
                />
              );
            })}
          </div>
        ))}
      </div>
    ));

  const hasExtras = layout.navRow || layout.arrows || layout.numpad;

  return (
    <div className="chart-card p-4">
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
        <div className="space-y-0.5">
          {renderRows(layout.rows, 'main')}
        </div>
        {hasExtras && (
          <div className="space-y-0.5">
            {layout.navRow && renderRows(layout.navRow, 'nav')}
            {layout.arrows && renderRows(layout.arrows, 'arr')}
            {layout.numpad && renderRows(layout.numpad, 'num')}
          </div>
        )}
      </div>

      {/* Color legend — opacity ramp */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <span className="bracket-legend">[LESS]</span>
        <div className="flex gap-0.5">
          {levels.map((v, i) => (
            <div key={i} style={{
              width: 20,
              height: 6,
              borderRadius: 1,
              backgroundColor: getHeatBg(v),
              border: '1px solid var(--border)',
            }} />
          ))}
        </div>
        <span className="bracket-legend">[MORE]</span>
      </div>
    </div>
  );
}
