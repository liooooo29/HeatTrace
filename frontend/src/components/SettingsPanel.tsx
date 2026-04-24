import { useEffect, useRef, useState } from 'react';
import { GetConfig, SaveConfig, GetMonitorStatus, ToggleMonitor, TestMonitor, GetEventCount, BrowserOpenURL, ClearAllData, Quit, GetDefaultDataDir, SwitchDataDir, PickDataDir } from '../wails-bindings';
import { ErrorPage } from './ErrorPage';
import { KeyboardDebug } from './KeyboardDebug';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { AppConfig } from '../types';
import { themes } from '../themes';
import { accentPresets } from '../hooks/useTheme';

interface SettingsPanelProps {
  lang: Lang;
  onBack: () => void;
  theme: string;
  onThemeChange: (id: string) => void;
  customAccent: string;
  onAccentChange: (color: string) => void;
  onLangChange: (lang: Lang) => void;
}

export function SettingsPanel({ lang, onBack, theme, onThemeChange, customAccent, onAccentChange, onLangChange }: SettingsPanelProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [monStatus, setMonStatus] = useState({ running: false, access_err: '' });
  const [toggleErr, setToggleErr] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [showKbDebug, setShowKbDebug] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [switchingDir, setSwitchingDir] = useState(false);
  const [defaultDataDir, setDefaultDataDir] = useState('');
  const prevDataDirRef = useRef<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function load() {
      try {
        const [cfg, status, defaultDir] = await Promise.all([GetConfig(), GetMonitorStatus(), GetDefaultDataDir()]);
        setConfig(cfg);
        prevDataDirRef.current = cfg?.data_dir || '';
        setMonStatus(status);
        setDefaultDataDir(defaultDir);
        setLoadError('');
      } catch (e) {
        console.error('Failed to load config:', e);
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    timer = setInterval(async () => {
      try {
        const status = await GetMonitorStatus();
        setMonStatus(status);
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Live event counter when monitoring is active
  useEffect(() => {
    if (!monStatus.running) return;
    const interval = setInterval(async () => {
      try {
        const count = await GetEventCount();
        setEventCount(count);
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [monStatus.running]);

  // Auto-save config on change (debounced 500ms), but exclude data_dir (handled below)
  useEffect(() => {
    if (!config) return;
    if (prevDataDirRef.current !== null && (config.data_dir || '') !== prevDataDirRef.current) return;
    const timer = setTimeout(handleSave, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Live-switch data directory when changed
  useEffect(() => {
    if (!config || prevDataDirRef.current === null) return;
    const newDir = config.data_dir || '';
    if (newDir === prevDataDirRef.current) return;
    const timer = setTimeout(async () => {
      try {
        setSwitchingDir(true);
        await SwitchDataDir(newDir);
        prevDataDirRef.current = newDir;
        const status = await GetMonitorStatus();
        setMonStatus(status);
      } catch (e) {
        console.error('Failed to switch data dir:', e);
      }
      setSwitchingDir(false);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.data_dir]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await SaveConfig(config);
      const status = await GetMonitorStatus();
      setMonStatus(status);
    } catch (e) {
      console.error('Failed to save config:', e);
    }
    setSaving(false);
  };

  const handleToggle = async () => {
    setToggleErr('');
    setTestResult(null);
    try {
      const running = await ToggleMonitor();
      const status = await GetMonitorStatus();
      setMonStatus(status);
      if (config) setConfig({ ...config, monitor_enabled: running });
      if (!running) setEventCount(0);
    } catch (e) {
      setToggleErr('Failed to toggle monitor');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await TestMonitor();
      setTestResult({ success: result.success, message: result.message });
      if (result.success) setEventCount(prev => prev + result.count);
    } catch (e) {
      setTestResult({ success: false, message: 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handlePickDirectory = async () => {
    try {
      const dir = await PickDataDir();
      if (dir) setConfig({ ...config!, data_dir: dir });
    } catch (e) {
      console.error('Failed to pick directory:', e);
    }
  };

  if (loadError && !config) return (
    <div>
      <div className="mb-6">
        <h2 className="page-title">{t('set.title', lang)}</h2>
        <p className="page-subtitle">{t('set.subtitle', lang)}</p>
      </div>
      <ErrorPage message={t('error.loadFailed', lang)} details={loadError} lang={lang}
        onRetry={() => setLoadError('')} />
    </div>
  );

  if (!config) return (
    <div>
      <div className="mb-6"><h2 className="page-title">{t('set.title', lang)}</h2></div>
      <div className="max-w-lg space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-20" />)}</div>
    </div>
  );

  const inputStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--fg)',
  };

  return (
    <div>
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)' }}
          title={t('common.cancel', lang)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>{t('set.title', lang)}</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{t('set.subtitle', lang)}</p>
        </div>
      </div>

      <div className="space-y-5" style={{ maxWidth: 680 }}>
        {/* Language */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>{t('set.language', lang)}</div>
          <div className="flex gap-2">
            {(['en', 'zh'] as Lang[]).map(l => (
              <button key={l} onClick={() => onLangChange(l)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: lang === l ? 'var(--accent-bg)' : 'var(--surface)',
                  color: lang === l ? 'var(--accent)' : 'var(--muted)',
                  border: lang === l ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                }}>
                {l === 'en' ? 'English' : '中文'}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>{t('set.theme', lang)}</div>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(t => (
              <button key={t.id} onClick={() => onThemeChange(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-left"
                style={{
                  backgroundColor: theme === t.id ? 'var(--accent-bg)' : 'var(--surface)',
                  border: theme === t.id ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                }}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{
                  backgroundColor: t.vars['--accent'],
                  border: theme === t.id ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                }} />
                <span className="text-[11px] font-medium truncate" style={{ color: theme === t.id ? 'var(--accent)' : 'var(--fg)' }}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>

          {/* Accent color */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--muted)' }}>Accent Color</div>
            <div className="flex flex-wrap gap-1.5">
              {accentPresets.map(color => (
                <button key={color}
                  onClick={() => onAccentChange(customAccent === color ? '' : color)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-125"
                  style={{
                    backgroundColor: color,
                    border: customAccent === color ? '2px solid var(--fg)' : '1.5px solid var(--border)',
                    transform: customAccent === color ? 'scale(1.15)' : undefined,
                  }} />
              ))}
              <label className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                style={{ border: '1.5px dashed var(--border)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <input type="color" value={customAccent || '#FF6600'}
                  onChange={e => onAccentChange(e.target.value)}
                  className="sr-only" />
              </label>
            </div>
            {customAccent && (
              <button onClick={() => onAccentChange('')}
                className="text-[10px] mt-1.5 font-medium"
                style={{ color: 'var(--muted)' }}>
                Reset to default
              </button>
            )}
          </div>
        </div>

        {/* 1. Monitoring — status + toggle */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: monStatus.running ? 'var(--green-bg)' : 'var(--surface-2)' }}>
                {monStatus.running ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                )}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                  {monStatus.running ? t('set.active', lang) : t('set.paused', lang)}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {monStatus.running
                    ? `${t('set.tracking', lang)}${eventCount > 0 ? ` · ${eventCount} ${t('set.eventCount', lang)}` : ''}`
                    : t('set.trackingPaused', lang)}
                </div>
              </div>
            </div>
            <button onClick={handleToggle}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: monStatus.running ? 'var(--red-bg)' : 'var(--accent-bg)',
                color: monStatus.running ? 'var(--red)' : 'var(--accent)',
              }}>
              {monStatus.running ? t('set.stop', lang) : t('set.start', lang)}
            </button>
          </div>

          {toggleErr && (
            <div className="mt-3 text-xs px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}>
              {toggleErr}
            </div>
          )}

          {/* Accessibility warning */}
          {monStatus.access_err && (
            <div className="mt-3 text-xs px-3 py-2.5 rounded-lg flex items-center justify-between"
              style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' }}>
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>{t('set.accessWarn', lang)}</span>
              </div>
              <button
                onClick={() => BrowserOpenURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold shrink-0"
                style={{ backgroundColor: 'var(--amber)', color: '#000' }}>
                {t('set.openSettings', lang)}
              </button>
            </div>
          )}

          {/* Test row — compact, secondary action */}
          {monStatus.running && (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={handleTest} disabled={testing}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                {testing && (
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
                {testing ? t('set.testing', lang) : t('set.testMonitor', lang)}
              </button>
              {testResult && (
                <span className="text-[11px] font-medium" style={{ color: testResult.success ? 'var(--green)' : 'var(--red)' }}>
                  {testResult.message}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. Configuration */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>{t('set.config', lang)}</div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--fg)' }}>{t('set.retention', lang)}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t('set.retentionDesc', lang)}</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={config.data_retention_days}
                  onChange={e => setConfig({ ...config, data_retention_days: parseInt(e.target.value) || 90 })}
                  className="w-20 rounded-lg px-3 py-1.5 text-sm border tabular-nums text-right"
                  style={inputStyle} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{t('set.days', lang)}</span>
              </div>
            </label>

            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

            {/* Data directory — single input + browse button */}
            <div>
              <div className="text-sm mb-1" style={{ color: 'var(--fg)' }}>{t('set.dataDir', lang)}</div>
              <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{t('set.dataDirDesc', lang)}</div>

              <div className="flex gap-2">
                <input type="text" value={config.data_dir || ''}
                  onChange={e => setConfig({ ...config, data_dir: e.target.value })}
                  placeholder={defaultDataDir}
                  className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-xs border font-mono"
                  style={inputStyle} />
                <button onClick={handlePickDirectory}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  Browse
                </button>
                {switchingDir && (
                  <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--muted-2)' }}>
                {t('set.dataDirDefault', lang)}: {defaultDataDir}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Danger zone — visually separated */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="card p-4" style={{ borderColor: 'var(--red-bg)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--red-bg)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold" style={{ color: 'var(--red)' }}>{t('set.uninstall', lang)}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{t('set.uninstallDesc', lang)}</div>
              </div>
              <button onClick={() => setShowClearConfirm(v => !v)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0"
                style={{
                  backgroundColor: showClearConfirm ? 'var(--red)' : 'var(--red-bg)',
                  color: showClearConfirm ? '#fff' : 'var(--red)',
                }}>
                {showClearConfirm ? t('common.cancel', lang) : t('set.uninstallBtn', lang)}
              </button>
            </div>

            {showClearConfirm && (
              <div className="mt-3 pt-3 flex items-center gap-3"
                style={{ borderTop: '1px solid var(--red-bg)' }}>
                <div className="flex-1">
                  <div className="text-[11px] font-medium" style={{ color: 'var(--red)' }}>{t('set.uninstallTitle', lang)}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{t('set.uninstallModalDesc', lang)}</div>
                </div>
                <button onClick={async () => {
                  setClearing(true);
                  try {
                    await ClearAllData();
                    setShowClearConfirm(false);
                    await Quit();
                  } catch (e) {
                    console.error('Clear failed:', e);
                  }
                  setClearing(false);
                }} disabled={clearing}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0"
                  style={{ backgroundColor: 'var(--red)', color: '#fff' }}>
                  {clearing ? '...' : t('set.confirmUninstall', lang)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced — keyboard debug (collapsed, full width) */}
      <div className="mt-4">
        <button onClick={() => setShowKbDebug(v => !v)}
          className="text-xs font-medium flex items-center gap-1.5 px-1 py-1"
          style={{ color: 'var(--muted)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showKbDebug ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Keyboard Debug
        </button>
        {showKbDebug && (
          <div className="mt-2">
            <KeyboardDebug lang={lang} />
          </div>
        )}
      </div>
    </div>
  );
}
