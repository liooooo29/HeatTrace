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
  const { theme, setTheme, customAccent, setCustomAccent } = useTheme();
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
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Warning Banner */}
      {accessErr && !dismissed && (
        <div className="flex items-center justify-between px-5 py-2.5 text-sm"
          style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="font-medium">{t('banner.access', lang)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => BrowserOpenURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')}
              className="px-3 py-1 rounded-md text-xs font-semibold"
              style={{ backgroundColor: 'var(--amber)', color: '#000' }}>
              {t('banner.openSystem', lang)}
            </button>
            <button onClick={() => setDismissed(true)}
              className="text-xs opacity-50 hover:opacity-100">
              {t('banner.dismiss', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="nav-bar flex items-center justify-between px-5 h-11 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--fg)' }}>HeatTrace</span>
        </div>
        <div className="flex items-center gap-2 nav-no-drag">
          {/* Settings */}
          <button onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--muted)' }}
            aria-label={t('nav.settings', lang)} title={t('nav.settings', lang)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          {/* Window controls */}
          <div className="flex items-center gap-1.5 ml-1">
            <button onClick={() => WindowMinimise()}
              className="w-3 h-3 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#febc2e' }} />
            <button onClick={() => WindowToggleMaximise()}
              className="w-3 h-3 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#28c840' }} />
            <button onClick={() => WindowHide()}
              className="w-3 h-3 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#ff5f57' }} />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto flex justify-center">
        <div className="w-full px-6 py-6" style={{ maxWidth: 960 }}>
          <ErrorBoundary lang={lang}>
            {showSettings ? (
              <SettingsPanel lang={lang} onBack={() => setShowSettings(false)}
                theme={theme} onThemeChange={setTheme}
                customAccent={customAccent} onAccentChange={setCustomAccent}
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
