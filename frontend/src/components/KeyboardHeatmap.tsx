import { useMemo } from 'react';
import type { KeyHeatPoint } from '../types';

// Physical keyboard layout — each entry is [baseKey, shiftedKey?]
// The heatmap stores normalized base keys (e.g. "/" not "?")
const ROWS: [string, string?][][][] = [
  // Row 0: number row
  [
    [['`','~'], ['1','!'], ['2','@'], ['3','#'], ['4','$'], ['5','%']],
    [['6','^'], ['7','&'], ['8','*'], ['9','('], ['0',')'], ['-','_'], ['=','+']],
    [['Backspace']],
  ],
  // Row 1: QWERTY top
  [
    [['Tab']],
    [['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p']],
    [['[','{'], [']','}'], ['\\','|']],
  ],
  // Row 2: ASDF home
  [
    [['Caps']],
    [['a'], ['s'], ['d'], ['f'], ['g'], ['h'], ['j'], ['k'], ['l']],
    [[';',':'], ["'",'"'], ['Enter']],
  ],
  // Row 3: ZXCV bottom
  [
    [['Shift']],
    [['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m']],
    [[',','<'], ['.','>'], ['/','?'], ['Shift']],
  ],
  // Row 4: modifiers
  [
    [['Ctrl'], ['Opt'], ['Cmd'], ['Space'], ['Cmd'], ['Opt'], ['Ctrl']],
  ],
];

// Group widths: how much horizontal space each segment takes
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

interface KeyCellProps {
  baseKey: string;
  shiftedKey?: string;
  count: number;
  value: number;
  width: number;
}

function KeyCell({ baseKey, shiftedKey, count, value, width }: KeyCellProps) {
  const intensity = Math.round(value * 85);
  const hasShift = !!shiftedKey && shiftedKey !== baseKey;

  return (
    <div
      className="heatmap-key"
      style={{
        width,
        backgroundColor: intensity > 0
          ? `color-mix(in srgb, var(--accent) ${intensity}%, transparent)`
          : 'var(--surface)',
        border: `1px solid ${value > 0.4 ? 'color-mix(in srgb, var(--accent) 30%, var(--border))' : 'var(--border)'}`,
      }}
      title={`${baseKey}${hasShift ? ` / ${shiftedKey}` : ''}: ${count.toLocaleString()}`}
    >
      {hasShift && (
        <span className="heatmap-key-shift">{shiftedKey}</span>
      )}
      <span
        className="heatmap-key-base"
        style={{
          color: value > 0.3 ? 'var(--fg)' : 'var(--muted-2)',
          fontWeight: value > 0.5 ? 600 : 400,
        }}
      >
        {baseKey.length > 1 ? getDisplayLabel(baseKey) : baseKey.toUpperCase()}
      </span>
      {value > 0 && count > 0 && (
        <span className="heatmap-key-count" style={{ color: value > 0.4 ? 'var(--accent)' : 'var(--muted)' }}>
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </div>
  );
}

export function KeyboardHeatmap({ keys }: { keys: KeyHeatPoint[] }) {
  const keyMap = useMemo(
    () => new Map(keys.map(k => [k.key.toLowerCase(), k])),
    [keys]
  );

  const maxCount = useMemo(() => Math.max(...keys.map(k => k.count), 1), [keys]);

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
    </div>
  );
}
