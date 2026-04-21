import { useEffect, useState, useRef } from 'react';
import { GetLastKeyEvent } from '../wails-bindings';
import type { Lang } from '../i18n';

// Keyboard layout: [label, browserCode, widthUnits]
// 1 unit ≈ 38px. Standard keys = 1u, modifiers scale proportionally.
const ROWS: [string, string, number?][][] = [
  [ ['Esc','Escape'], ['F1','F1'], ['F2','F2'], ['F3','F3'], ['F4','F4'], ['F5','F5'], ['F6','F6'], ['F7','F7'], ['F8','F8'], ['F9','F9'], ['F10','F10'], ['F11','F11'], ['F12','F12'] ],
  [ ['`','Backquote'], ['1','Digit1'], ['2','Digit2'], ['3','Digit3'], ['4','Digit4'], ['5','Digit5'], ['6','Digit6'], ['7','Digit7'], ['8','Digit8'], ['9','Digit9'], ['0','Digit0'], ['-','Minus'], ['=','Equal'], ['⌫','Backspace',2] ],
  [ ['Tab','Tab',1.5], ['Q','KeyQ'], ['W','KeyW'], ['E','KeyE'], ['R','KeyR'], ['T','KeyT'], ['Y','KeyY'], ['U','KeyU'], ['I','KeyI'], ['O','KeyO'], ['P','KeyP'], ['[','BracketLeft'], [']','BracketRight'], ['\\','Backslash',1.5] ],
  [ ['Caps','CapsLock',1.75], ['A','KeyA'], ['S','KeyS'], ['D','KeyD'], ['F','KeyF'], ['G','KeyG'], ['H','KeyH'], ['J','KeyJ'], ['K','KeyK'], ['L','KeyL'], [';','Semicolon'], ["'",'Quote'], ['Enter','Enter',2.25] ],
  [ ['Shift','ShiftLeft',2.25], ['Z','KeyZ'], ['X','KeyX'], ['C','KeyC'], ['V','KeyV'], ['B','KeyB'], ['N','KeyN'], ['M','KeyM'], [',','Comma'], ['.','Period'], ['/','Slash'], ['Shift','ShiftRight',2.75] ],
  [ ['Ctrl','ControlLeft',1.25], ['Super','MetaLeft',1.25], ['Alt','AltLeft',1.25], ['Space','Space',6.25], ['Alt','AltRight',1.25], ['Ctrl','ControlRight',1.25] ],
];

const NAV_ROW: [string, string][][] = [
  [['Ins','Insert'],['Home','Home'],['PgUp','PageUp']],
  [['Del','Delete'],['End','End'],['PgDn','PageDown']],
];

const ARROWS: [string, string][][] = [
  [['',''], ['↑','ArrowUp'], ['','']],
  [['←','ArrowLeft'], ['↓','ArrowDown'], ['→','ArrowRight']],
];

const UNIT = 38;
const GAP = 4;

function Key({ label, code, w, active }: { label: string; code: string; w: number; active: boolean }) {
  if (!label) return <div style={{ width: UNIT, height: UNIT }} />;
  return (
    <div
      className="kb-key"
      data-active={active}
      style={{
        width: w,
        height: UNIT,
        backgroundColor: active ? 'var(--accent)' : undefined,
        color: active ? '#fff' : undefined,
        borderColor: active ? 'var(--accent)' : undefined,
        boxShadow: active ? '0 0 12px var(--glow)' : undefined,
      }}
    >
      <span style={{ fontWeight: label.length > 1 ? 500 : 400 }}>{label}</span>
    </div>
  );
}

export function KeyboardDebug({ lang }: { lang: Lang }) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [lastBrowser, setLastBrowser] = useState<any>(null);
  const [lastGo, setLastGo] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      e.preventDefault();
      setPressed(prev => new Set(prev).add(e.code));
      setLastBrowser({ code: e.code, key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
    };
    const up = (e: KeyboardEvent) => {
      setPressed(prev => { const n = new Set(prev); n.delete(e.code); return n; });
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    let prev = '';
    const timer = setInterval(async () => {
      try {
        const ev = await GetLastKeyEvent();
        if (ev?.key && ev.key !== prev) {
          prev = ev.key;
          setLastGo(ev);
          const hex = (n: number) => n?.toString(16).toUpperCase().padStart(2, '0');
          const mods = (ev.modifiers || []).length ? ` ${ev.modifiers.join('+')}` : '';
          const line = `key="${ev.key}"  keychar=${ev.keychar} (0x${hex(ev.keychar)})  rawcode=${ev.rawcode} (0x${hex(ev.rawcode)})  mask=0x${ev.mask?.toString(16).toUpperCase().padStart(4, '0')}${mods}`;
          logRef.current = [line, ...logRef.current].slice(0, 60);
          setLog([...logRef.current]);
        }
      } catch {}
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const field = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'var(--muted-2)', width: 60 }}>{label}</span>
      <span className="font-mono text-[13px]" style={{ color: 'var(--fg)' }}>{value}</span>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="page-title">Keyboard Debug</h2>
        <p className="page-subtitle">Press any key to compare browser event vs Go backend</p>
      </div>

      {/* Info panels */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-4" style={{ borderLeft: '3px solid var(--muted-2)' }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Browser</div>
          {lastBrowser ? (
            <div className="space-y-1.5">
              {field('code', lastBrowser.code)}
              {field('key', `"${lastBrowser.key}"`)}
              {(lastBrowser.shift || lastBrowser.ctrl || lastBrowser.alt) &&
                field('mods', [lastBrowser.shift && 'Shift', lastBrowser.ctrl && 'Ctrl', lastBrowser.alt && 'Alt'].filter(Boolean).join(' + '))}
            </div>
          ) : <div className="text-xs" style={{ color: 'var(--muted-2)' }}>Waiting for input...</div>}
        </div>
        <div className="card p-4" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="section-title" style={{ marginBottom: 8, color: 'var(--accent)' }}>Go Backend</div>
          {lastGo ? (
            <div className="space-y-1.5">
              {field('key', <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{lastGo.key}</span>)}
              {field('keychar', <>{lastGo.keychar} <span style={{ color: 'var(--muted-2)' }}>(0x{lastGo.keychar?.toString(16).toUpperCase()})</span></>)}
              {field('rawcode', <>{lastGo.rawcode} <span style={{ color: 'var(--muted-2)' }}>(0x{lastGo.rawcode?.toString(16).toUpperCase()})</span></>)}
              {field('mask', <span>0x{lastGo.mask?.toString(16).toUpperCase().padStart(4, '0')}</span>)}
              {lastGo.modifiers?.length > 0 && field('mods', lastGo.modifiers.join(' + '))}
            </div>
          ) : <div className="text-xs" style={{ color: 'var(--muted-2)' }}>Monitor must be running</div>}
        </div>
      </div>

      {/* Keyboard */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col items-center" style={{ gap: GAP }}>
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex" style={{ gap: GAP }}>
              {row.map(([label, code, u]) => (
                <Key key={code} label={label} code={code} w={(u || 1) * UNIT + ((u || 1) - 1) * GAP} active={pressed.has(code)} />
              ))}
            </div>
          ))}

          {/* Nav + Arrows row */}
          <div className="flex items-start" style={{ gap: GAP, marginTop: 8 }}>
            <div className="flex flex-col" style={{ gap: GAP }}>
              {NAV_ROW.map((row, ri) => (
                <div key={ri} className="flex" style={{ gap: GAP }}>
                  {row.map(([label, code]) => <Key key={code} label={label} code={code} w={UNIT} active={pressed.has(code)} />)}
                </div>
              ))}
            </div>
            <div style={{ width: 12 }} />
            <div className="flex flex-col" style={{ gap: GAP }}>
              {ARROWS.map((row, ri) => (
                <div key={ri} className="flex" style={{ gap: GAP }}>
                  {row.map(([label, code]) => <Key key={code || Math.random()} label={label} code={code} w={UNIT} active={code ? pressed.has(code) : false} />)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="section-title" style={{ marginBottom: 0 }}>Event Log</div>
            <button onClick={() => { logRef.current = []; setLog([]); }}
              className="text-[10px] px-2.5 py-1 rounded-md font-medium"
              style={{ color: 'var(--muted)', backgroundColor: 'var(--surface-2)' }}>
              Clear
            </button>
          </div>
          <div ref={logBoxRef} className="font-mono text-[11px] space-y-1 max-h-44 overflow-auto pr-1" style={{ color: 'var(--fg-2)' }}>
            {log.map((l, i) => (
              <div key={i} className="px-2 py-0.5 rounded" style={{
                backgroundColor: i === 0 ? 'var(--accent-bg)' : 'transparent',
                color: i === 0 ? 'var(--accent)' : 'var(--fg-2)',
              }}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
