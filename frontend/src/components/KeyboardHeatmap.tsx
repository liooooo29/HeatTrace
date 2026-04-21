import { useMemo, useState } from 'react';
import type { KeyHeatPoint } from '../types';

const ROWS: [string, string?][][][] = [
  [
    [['`','~'], ['1','!'], ['2','@'], ['3','#'], ['4','$'], ['5','%']],
    [['6','^'], ['7','&'], ['8','*'], ['9','('], ['0',')'], ['-','_'], ['=','+']],
    [['Backspace']],
  ],
  [
    [['Tab']],
    [['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p']],
    [['[','{'], [']','}'], ['\\','|']],
  ],
  [
    [['Caps']],
    [['a'], ['s'], ['d'], ['f'], ['g'], ['h'], ['j'], ['k'], ['l']],
    [[';',':'], ["'",'"'], ['Enter']],
  ],
  [
    [['Shift']],
    [['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m']],
    [[',','<'], ['.','>'], ['/','?'], ['Shift']],
  ],
  [
    [['Ctrl'], ['Opt'], ['Cmd'], ['Space'], ['Cmd'], ['Opt'], ['Ctrl']],
  ],
];

function getKeyWidth(key: string): number {
  switch (key) {
    case 'Backspace': return 72;
    case 'Tab': return 56;
    case 'Caps': return 64;
    case 'Enter': return 80;
    case 'Shift': return 82;
    case 'Ctrl': case 'Opt': return 44;
    case 'Cmd': return 50;
    case 'Space': return 220;
    default: return 36;
  }
}

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

// Smooth heatmap: opacity-based accent tint, text color adapts
function getHeatBg(value: number): string {
  if (value <= 0) return 'var(--surface-2)';
  // 6 levels of opacity: 8%, 18%, 30%, 45%, 62%, 80%
  const opacities = [0.08, 0.18, 0.30, 0.45, 0.62, 0.80];
  const idx = Math.min(Math.floor(value * 6), 5);
  return `color-mix(in srgb, var(--accent) ${Math.round(opacities[idx] * 100)}%, var(--surface-2))`;
}

function getHeatFg(value: number): { label: string; count: string } {
  if (value <= 0) return { label: 'var(--muted-2)', count: 'transparent' };
  if (value < 0.3) return { label: 'var(--muted)', count: 'var(--muted-2)' };
  if (value < 0.6) return { label: 'var(--fg-2)', count: 'var(--accent)' };
  if (value < 0.8) return { label: 'var(--fg)', count: 'var(--accent-hover)' };
  return { label: '#FFFFFF', count: '#FFFFFF' };
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
        border: `1px solid ${value > 0.5 ? 'color-mix(in srgb, var(--accent) 30%, var(--border))' : 'var(--border)'}`,
      }}
      title={`${baseKey}${hasShift ? ` / ${shiftedKey}` : ''}: ${count.toLocaleString()}`}
    >
      {hasShift && (
        <span className="heatmap-key-shift" style={{ color: fg.label, opacity: 0.5 }}>
          {shiftedKey}
        </span>
      )}
      <span
        className="heatmap-key-base"
        style={{ color: fg.label, fontWeight: value > 0.5 ? 600 : 400 }}
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

export function KeyboardHeatmap({ keys }: { keys: KeyHeatPoint[] }) {
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

  // Color legend
  const levels = [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0];

  return (
    <div className="chart-card p-4">
      <div className="space-y-1">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-0.5 justify-center">
            {row.map((group, gi) => (
              <div key={gi} className="flex gap-0.5">
                {group.map(([baseKey, shiftedKey], ki) => {
                  const data = keyMap.get(baseKey.toLowerCase());
                  const count = data?.count || 0;
                  const value = count / maxCount;
                  const width = getKeyWidth(baseKey);
                  return (
                    <KeyCell
                      key={`${ri}-${gi}-${ki}`}
                      baseKey={baseKey}
                      shiftedKey={shiftedKey}
                      count={count}
                      value={value}
                      width={width}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>Less</span>
        <div className="flex gap-0.5">
          {levels.map((v, i) => (
            <div key={i} style={{
              width: 20,
              height: 8,
              borderRadius: 2,
              backgroundColor: getHeatBg(v),
              border: '1px solid var(--border)',
            }} />
          ))}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>More</span>
      </div>
    </div>
  );
}
