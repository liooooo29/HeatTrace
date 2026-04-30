import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import { useMorph } from './hooks/useMorph';
import { useLang } from './hooks/useLang';
import { useFont } from './hooks/useFont';
import { GetMonitorStatus, ToggleMonitor, BrowserOpenURL } from './wails-bindings';
import { WindowMinimise, WindowToggleMaximise, WindowHide, WindowIsMaximised } from '../wailsjs/runtime/runtime';
import { morphPresets } from './themes';
import { t } from './i18n';
import heattraceIconDark from './assets/images/heattrace-icon.png';
import heattraceIconLight from './assets/images/heattrace-icon-light.png';

function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [historyMode, setHistoryMode] = useState(false);
  const [accessErr, setAccessErr] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMaximised, setIsMaximised] = useState(false);

  // Theme system
  const { mode, resolved, toggleMode, setMode, presetId, setPreset } = useTheme();

  // Morph state — persisted in localStorage
  const [morphEnabled, setMorphEnabled] = useState(() => {
    return localStorage.getItem('heattrace-morph') === 'true';
  });
  const [morphPresetId, setMorphPresetId] = useState(() => {
    return localStorage.getItem('heattrace-morph-preset') || 'thermal';
  });

  useEffect(() => {
    localStorage.setItem('heattrace-morph', String(morphEnabled));
  }, [morphEnabled]);

  useEffect(() => {
    localStorage.setItem('heattrace-morph-preset', morphPresetId);
  }, [morphPresetId]);

  const morphColors = (morphPresets.find(p => p.id === morphPresetId) || morphPresets[0]).colors;
  const { wpm: morphWpm, peakWpm: morphPeakWpm, avgWpm1m: morphAvgWpm1m, wpmHistory: morphWpmHistory } = useMorph({
    enabled: morphEnabled,
    colors: morphColors,
    mode: resolved,
  });

  const { lang, switchLang } = useLang();
  const { font, switchFont } = useFont();

  const refreshStatus = () => {
    GetMonitorStatus().then(s => {
      setAccessErr(s.access_err || '');
      setMonitorRunning(s.running);
    }).catch(() => {});
  };

  useEffect(() => { refreshStatus(); }, []);

  useEffect(() => {
    WindowIsMaximised().then(setIsMaximised).catch(() => {});
    const onFocus = () => WindowIsMaximised().then(setIsMaximised).catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleToggleMaximise = async () => {
    WindowToggleMaximise();
    // Delay to let the window state settle
    setTimeout(() => WindowIsMaximised().then(setIsMaximised).catch(() => {}), 100);
  };

  useEffect(() => {
    const onFocus = async () => {
      const prevErr = accessErr;
      refreshStatus();
      if (prevErr && !monitorRunning) {
        try {
          const status = await GetMonitorStatus();
          if (!status.access_err && !status.running) {
            await ToggleMonitor();
            refreshStatus();
          }
        } catch {}
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [accessErr, monitorRunning]);

  const dr = historyMode ? dateRange : { start: today, end: today };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--black)' }}>
      {/* Warning Banner */}
      {accessErr && !dismissed && (
        <div className="flex items-center justify-between px-5 py-2.5 text-sm"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="label" style={{ fontSize: 12 }}>
              {t('banner.access', lang)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => BrowserOpenURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')}
              className="btn-base btn-xs"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                minHeight: 28,
              }}>
              {t('banner.openSystem', lang)}
            </button>
            <button onClick={() => setDismissed(true)}
              className="text-xs"
              style={{ color: 'var(--text-disabled)' }}>
              {t('banner.dismiss', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Nav — Nothing style */}
      <nav className="nav-bar flex items-center justify-between px-5 h-11 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <img src={resolved === 'dark' ? heattraceIconDark : heattraceIconLight} alt="HeatTrace" width={22} height={22} style={{ borderRadius: 5 }} />
          <span style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-display)',
            letterSpacing: '-0.01em',
          }}>HeatTrace</span>
        </div>

        <div className="flex items-center gap-2 nav-no-drag">
          {/* Theme mode: auto → dark → light → auto */}
          <button onClick={() => {
            const next = mode === 'auto' ? 'dark' : mode === 'dark' ? 'light' : 'auto';
            setMode(next);
          }} className="nav-icon-btn"
            aria-label={`Theme: ${mode}`}>
            {mode === 'auto' ? (
              // Monitor/display icon for "follow system"
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            ) : mode === 'dark' ? (
              // Moon icon
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              // Sun icon
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>

          {/* Settings */}
          <button onClick={() => setShowSettings(true)} className="nav-icon-btn"
            aria-label={t('nav.settings', lang)} title={t('nav.settings', lang)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Window controls */}
          <div className="flex items-center gap-1 ml-1">
            <button onClick={() => WindowMinimise()}
              className="nav-icon-btn" aria-label="Minimise">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="2" y1="5" x2="8" y2="5"/>
              </svg>
            </button>
            <button onClick={handleToggleMaximise}
              className="nav-icon-btn" aria-label={isMaximised ? 'Restore' : 'Maximise'}>
              {isMaximised ? (
                // Restore: two overlapping rectangles
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="0.5" y="2.5" width="5.5" height="5.5" rx="0.5"/><polyline points="4.5 2.5 4.5 0.5 9.5 0.5 9.5 5.5 7.5 5.5"/>
                </svg>
              ) : (
                // Maximise: single rectangle
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="1.5" y="1.5" width="7" height="7" rx="0.5"/>
                </svg>
              )}
            </button>
            <button onClick={() => WindowHide()}
              className="nav-icon-btn" aria-label="Close">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto flex justify-center">
        <div className="w-full px-6 py-6" style={{ maxWidth: 960 }}>
          <ErrorBoundary lang={lang}>
            <div className="page-stack">
              <div className={showSettings ? 'page-hidden' : 'page-visible'}>
                <Dashboard dateRange={dr} lang={lang} monitorRunning={monitorRunning}
                  accessErr={accessErr} onMonitorChange={refreshStatus}
                  historyMode={historyMode} onToggleHistory={() => setHistoryMode(h => !h)}
                  onDateChange={(s, e) => setDateRange({ start: s, end: e })}
                  currentWpm={morphWpm} peakWpm={morphPeakWpm} avgWpm1m={morphAvgWpm1m} wpmHistory={morphWpmHistory} />
              </div>
              <div className={showSettings ? 'page-visible' : 'page-hidden'}>
                <SettingsPanel lang={lang} onBack={() => setShowSettings(false)}
                  mode={mode} resolved={resolved} onSetMode={setMode}
                  onLangChange={l => switchLang(l)}
                  activePresetId={presetId} onSelectPreset={setPreset}
                  morphEnabled={morphEnabled} morphPresetId={morphPresetId}
                  currentWpm={morphWpm}
                  onToggleMorph={() => setMorphEnabled(v => !v)}
                  onSelectMorphPreset={setMorphPresetId}
                  font={font} onFontChange={switchFont} />
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
