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
          {/* Logo — gradient heat bars */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="g1" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#C75B2A"/><stop offset="100%" stopColor="#FF8C5A"/></linearGradient>
              <linearGradient id="g2" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#B84420"/><stop offset="100%" stopColor="#FF6B35"/></linearGradient>
              <linearGradient id="g3" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#8B1A3A"/><stop offset="100%" stopColor="#E94560"/></linearGradient>
              <linearGradient id="g4" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#6B1040"/><stop offset="100%" stopColor="#D63A5A"/></linearGradient>
              <linearGradient id="g5" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#4A0E35"/><stop offset="100%" stopColor="#C22B50"/></linearGradient>
            </defs>
            <rect x="1" y="12" width="3" height="10" rx="1.5" fill="url(#g1)"/>
            <rect x="5.5" y="8" width="3" height="14" rx="1.5" fill="url(#g2)"/>
            <rect x="10" y="5" width="3" height="17" rx="1.5" fill="url(#g3)"/>
            <rect x="14.5" y="9" width="3" height="13" rx="1.5" fill="url(#g4)"/>
            <rect x="19" y="11" width="3" height="11" rx="1.5" fill="url(#g5)"/>
          </svg>
          <span style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-display)',
            letterSpacing: '-0.01em',
          }}>HeatTrace</span>
        </div>

        <div className="flex items-center gap-2 nav-no-drag">
          {/* Dark/Light toggle */}
          <button onClick={toggleMode} className="nav-icon-btn"
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {mode === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
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
            <button onClick={() => WindowToggleMaximise()}
              className="nav-icon-btn" aria-label="Maximise">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1.5" y="1.5" width="7" height="7" rx="0.5"/>
              </svg>
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
                  onDateChange={(s, e) => setDateRange({ start: s, end: e })} />
              </div>
              <div className={showSettings ? 'page-visible' : 'page-hidden'}>
                <SettingsPanel lang={lang} onBack={() => setShowSettings(false)}
                  mode={mode} onToggleMode={toggleMode}
                  onLangChange={l => switchLang(l)} />
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
