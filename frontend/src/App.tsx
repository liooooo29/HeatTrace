import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ActivityPanel } from './components/ActivityPanel';
import { TypingPanel } from './components/TypingPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { DateRangePicker } from './components/DateRangePicker';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import { useLang } from './hooks/useLang';
import { GetMonitorStatus, ToggleMonitor, BrowserOpenURL } from './wails-bindings';
import { t } from './i18n';
import type { Lang } from './i18n';

type Tab = 'overview' | 'activity' | 'typing' | 'settings';

function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [accessErr, setAccessErr] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const { theme, setTheme } = useTheme('dark');
  const { lang, switchLang } = useLang();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview', label: t('nav.overview', lang),
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    },
    {
      id: 'activity', label: t('nav.activity', lang),
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8"/></svg>,
    },
    {
      id: 'typing', label: t('nav.productivity', lang),
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
    {
      id: 'settings', label: t('nav.settings', lang),
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
  ];

  const refreshStatus = () => {
    GetMonitorStatus().then(s => {
      setAccessErr(s.access_err || '');
      setMonitorRunning(s.running);
    }).catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      const prevErr = accessErr;
      refreshStatus();
      // If permission was just granted (had error before), auto-start monitor
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

  const showDatePicker = activeTab !== 'settings';

  const renderPanel = () => {
    switch (activeTab) {
      case 'overview': return <Dashboard dateRange={dateRange} lang={lang} monitorRunning={monitorRunning} accessErr={accessErr} onMonitorChange={refreshStatus} />;
      case 'activity': return <ActivityPanel dateRange={dateRange} lang={lang} />;
      case 'typing': return <TypingPanel dateRange={dateRange} lang={lang} />;
      case 'settings': return <SettingsPanel lang={lang} />;
      default: return <Dashboard dateRange={dateRange} lang={lang} monitorRunning={monitorRunning} accessErr={accessErr} onMonitorChange={refreshStatus} />;
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Warning Banner - only show on non-overview tabs */}
      {accessErr && !dismissed && activeTab !== 'overview' && (
        <div className="flex items-center justify-between px-5 py-2.5 text-sm"
          style={{ backgroundColor: 'var(--amber-muted)', color: 'var(--amber)' }}>
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

      {/* Nav Bar */}
      <nav className="nav-bar flex items-center justify-between px-5 h-11 shrink-0">
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--green) 30%))' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
              HeatTrace
            </span>
          </div>
          {/* Tabs */}
          <div className="flex gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-[12.5px] rounded-md font-medium flex items-center gap-1.5 ${activeTab === tab.id ? 'nav-tab-active' : ''}`}
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent-muted)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          {showDatePicker && (
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onChange={(s, e) => setDateRange({ start: s, end: e })}
              lang={lang}
            />
          )}
          {/* Language Toggle */}
          <button
            onClick={() => switchLang(lang === 'en' ? 'zh' : 'en')}
            className="px-2 h-8 flex items-center justify-center rounded-lg text-[11px] font-semibold"
            style={{ color: 'var(--muted)' }}
            title="Language"
          >
            {lang === 'en' ? '中' : 'EN'}
          </button>
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sm"
            style={{ color: 'var(--muted)' }}
            title={`Theme: ${theme}`}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <ErrorBoundary lang={lang}>
          {renderPanel()}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
