import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import { useLang } from './hooks/useLang';
import { GetMonitorStatus, ToggleMonitor, BrowserOpenURL } from './wails-bindings';
import { WindowMinimise, WindowToggleMaximise, WindowHide } from '../wailsjs/runtime/runtime';
import { t } from './i18n';

function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [historyMode, setHistoryMode] = useState(false);
  const [accessErr, setAccessErr] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { mode, toggleMode } = useTheme();
  const { lang, switchLang } = useLang();

  const refreshStatus = () => {
    GetMonitorStatus().then(s => {
      setAccessErr(s.access_err || '');
      setMonitorRunning(s.running);
    }).catch(() => {});
  };

  useEffect(() => { refreshStatus(); }, []);

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
          {/* Logo — minimal */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-display)',
            letterSpacing: '-0.01em',
          }}>HeatTrace</span>
        </div>

        <div className="flex items-center gap-3 nav-no-drag">
          {/* Dark/Light toggle — bracket style */}
          <button onClick={toggleMode}
            className="bracket-legend"
            style={{ padding: '4px 0' }}>
            [{mode === 'dark' ? 'DARK' : 'LIGHT'}]
          </button>

          {/* Settings — ghost */}
          <button onClick={() => setShowSettings(true)}
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', padding: 4 }}
            aria-label={t('nav.settings', lang)} title={t('nav.settings', lang)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Window controls — Nothing monochrome */}
          <div className="flex items-center gap-2 ml-1">
            <button onClick={() => WindowMinimise()}
              className="window-control"
              aria-label="Minimise">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="5" x2="9" y2="5"/>
              </svg>
            </button>
            <button onClick={() => WindowToggleMaximise()}
              className="window-control"
              aria-label="Maximise">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1" y="1" width="8" height="8" rx="0.5"/>
              </svg>
            </button>
            <button onClick={() => WindowHide()}
              className="window-control"
              aria-label="Close">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto flex justify-center">
        <div className="w-full px-6 py-6" style={{ maxWidth: 960 }}>
          <ErrorBoundary lang={lang}>
            {showSettings ? (
              <SettingsPanel lang={lang} onBack={() => setShowSettings(false)}
                mode={mode} onToggleMode={toggleMode}
                onLangChange={l => switchLang(l)} />
            ) : (
              <Dashboard dateRange={dr} lang={lang} monitorRunning={monitorRunning}
                accessErr={accessErr} onMonitorChange={refreshStatus}
                historyMode={historyMode} onToggleHistory={() => setHistoryMode(h => !h)}
                onDateChange={(s, e) => setDateRange({ start: s, end: e })} />
            )}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
