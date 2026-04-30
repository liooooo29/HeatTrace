import { useEffect, useState, useRef } from 'react';
import { GetLastKeyEvent } from '../wails-bindings';
import type { Lang } from '../i18n';
import type { KeyboardLayout, LayoutKey } from '../data/keyboardLayouts';

const GAP = 4;
const TOTAL_UNITS = 15;

function Key({ label, code, flexUnits, w, h, active }: { label: string; code: string; flexUnits?: number; w?: number; h: number; active: boolean }) {
  if (!label) return <div style={{ width: w, height: h }} />;
  return (
    <div
      className="kb-key"
      data-active={active}
      style={{
        flex: flexUnits,
        width: w,
        height: h,
        minWidth: 0,
        backgroundColor: active ? 'var(--accent)' : undefined,
        color: active ? '#fff' : undefined,
        borderColor: active ? 'var(--accent)' : undefined,
      }}
    >
      <span style={{ fontWeight: label.length > 1 ? 500 : 400, fontSize: h < 30 ? 10 : undefined }}>{label}</span>
    </div>
  );
}

// Flatten grouped rows into flat rows for debug rendering
function flattenRows(grouped: LayoutKey[][][]): LayoutKey[][] {
  return grouped.map(row => row.flat());
}

export function KeyboardDebug({ lang, layout }: { lang: Lang; layout: KeyboardLayout }) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [lastBrowser, setLastBrowser] = useState<any>(null);
  const [lastGo, setLastGo] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(700);

  const mainRows = flattenRows(layout.debugRows);
  const navRows = layout.navRow ? flattenRows(layout.navRow) : [];
  const arrowRows = layout.arrows ? flattenRows(layout.arrows) : [];
  const numpadRows = layout.numpad ? flattenRows(layout.numpad) : [];
  const mediaRows = layout.mediaRow ? flattenRows(layout.mediaRow) : [];

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerW(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const mainKeyW = (containerW - (TOTAL_UNITS - 1) * GAP) / TOTAL_UNITS;
  const keyH = Math.max(24, Math.round(mainKeyW * 0.85));
  const navKeyW = Math.round(mainKeyW * 0.9);

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
      <span className="label-disabled" style={{ fontSize: 10, width: 60, flexShrink: 0 }}>{label}</span>
      <span className="text-mono" style={{ fontSize: 'var(--font-body-size)', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  return (
    <div ref={containerRef}>
      {/* Info panels */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-3 card-disabled-left">
          <div className="label-disabled" style={{ fontSize: 10, marginBottom: 8 }}>Browser</div>
          {lastBrowser ? (
            <div className="space-y-1">
              {field('code', lastBrowser.code)}
              {field('key', `"${lastBrowser.key}"`)}
              {(lastBrowser.shift || lastBrowser.ctrl || lastBrowser.alt) &&
                field('mods', [lastBrowser.shift && 'Shift', lastBrowser.ctrl && 'Ctrl', lastBrowser.alt && 'Alt'].filter(Boolean).join(' + '))}
            </div>
          ) : <div className="text-body-sm" style={{ color: 'var(--text-disabled)' }}>Waiting for input...</div>}
        </div>
        <div className="card p-3 card-accent-left">
          <div className="label-accent" style={{ fontSize: 10, marginBottom: 8 }}>Go backend</div>
          {lastGo ? (
            <div className="space-y-1">
              {field('key', <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{lastGo.key}</span>)}
              {field('keychar', <>{lastGo.keychar} <span style={{ color: 'var(--text-disabled)' }}>(0x{lastGo.keychar?.toString(16).toUpperCase()})</span></>)}
              {field('rawcode', <>{lastGo.rawcode} <span style={{ color: 'var(--text-disabled)' }}>(0x{lastGo.rawcode?.toString(16).toUpperCase()})</span></>)}
              {field('mask', <span>0x{lastGo.mask?.toString(16).toUpperCase().padStart(4, '0')}</span>)}
              {lastGo.modifiers?.length > 0 && field('mods', lastGo.modifiers.join(' + '))}
            </div>
          ) : <div className="text-body-sm" style={{ color: 'var(--text-disabled)' }}>Monitor must be running</div>}
        </div>
      </div>

      {/* Keyboard */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col items-center" style={{ gap: GAP }}>
          {mainRows.map((row, ri) => (
            <div key={ri} className="flex w-full" style={{ gap: GAP }}>
              {row.map((k) => (
                <Key key={k.code} label={k.label} code={k.code} flexUnits={k.width} h={keyH} active={pressed.has(k.code)} />
              ))}
            </div>
          ))}

          {(navRows.length > 0 || arrowRows.length > 0 || numpadRows.length > 0 || mediaRows.length > 0) && (
            <div className="flex items-start w-full" style={{ gap: GAP, marginTop: 8 }}>
              {navRows.length > 0 && (
                <div className="flex flex-col" style={{ gap: GAP }}>
                  {navRows.map((row, ri) => (
                    <div key={ri} className="flex" style={{ gap: GAP }}>
                      {row.map((k) => <Key key={k.code} label={k.label} code={k.code} w={navKeyW} h={keyH} active={pressed.has(k.code)} />)}
                    </div>
                  ))}
                </div>
              )}
              {arrowRows.length > 0 && (
                <>
                  <div style={{ width: 12 }} />
                  <div className="flex flex-col" style={{ gap: GAP }}>
                    {arrowRows.map((row, ri) => (
                      <div key={ri} className="flex" style={{ gap: GAP }}>
                        {row.map((k) => <Key key={k.code || Math.random()} label={k.label} code={k.code} w={navKeyW} h={keyH} active={k.code ? pressed.has(k.code) : false} />)}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {numpadRows.length > 0 && (
                <>
                  <div style={{ width: 12 }} />
                  <div className="flex flex-col" style={{ gap: GAP }}>
                    {numpadRows.map((row, ri) => (
                      <div key={ri} className="flex" style={{ gap: GAP }}>
                        {row.map((k) => <Key key={k.code} label={k.label} code={k.code} w={navKeyW} h={keyH} active={pressed.has(k.code)} />)}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {mediaRows.length > 0 && (
                <>
                  <div style={{ width: 12 }} />
                  <div className="flex flex-col" style={{ gap: GAP }}>
                    {mediaRows.map((row, ri) => (
                      <div key={ri} className="flex" style={{ gap: GAP }}>
                        {row.map((k) => <Key key={k.code} label={k.label} code={k.code} w={navKeyW} h={keyH} active={pressed.has(k.code)} />)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="label-disabled" style={{ fontSize: 10 }}>Event Log</div>
            <button onClick={() => { logRef.current = []; setLog([]); }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
                background: 'none',
                border: '1px solid var(--border-visible)',
                borderRadius: 999,
                padding: '2px 8px',
              }}>
              Clear
            </button>
          </div>
          <div className="text-mono" style={{ fontSize: 'var(--label-size)', maxHeight: 144, overflow: 'auto' }}>
            {log.map((l, i) => (
              <div key={i} style={{
                padding: '2px 8px',
                color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: i === 0 ? 'var(--accent-subtle)' : 'transparent',
              }}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
