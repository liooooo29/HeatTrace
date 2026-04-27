import { useEffect, useRef, useState } from 'react';
import { GetConfig, SaveConfig, GetMonitorStatus, ToggleMonitor, TestMonitor, GetEventCount, BrowserOpenURL, ClearAllData, Quit, GetDefaultDataDir, SwitchDataDir, PickDataDir } from '../wails-bindings';
import { ErrorPage } from './ErrorPage';
import { KeyboardDebug } from './KeyboardDebug';
import { SegmentedSpinner } from './SegmentedSpinner';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { AppConfig } from '../types';
import type { ThemeMode } from '../themes';

interface SettingsPanelProps {
  lang: Lang;
  onBack: () => void;
  mode: ThemeMode;
  onToggleMode: () => void;
  onLangChange: (lang: Lang) => void;
}

export function SettingsPanel({ lang, onBack, mode, onToggleMode, onLangChange }: SettingsPanelProps) {
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

  useEffect(() => {
    if (!config) return;
    if (prevDataDirRef.current !== null && (config.data_dir || '') !== prevDataDirRef.current) return;
    const timer = setTimeout(handleSave, 500);
    return () => clearTimeout(timer);
  }, [config]);

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
      <div className="loading-text flex items-center gap-3">[LOADING...]<SegmentedSpinner /></div>
    </div>
  );

  return (
    <div>
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack}
          className="back-btn"
          title={t('common.cancel', lang)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>{t('set.title', lang)}</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{t('set.subtitle', lang)}</p>
        </div>
      </div>

      <div style={{ maxWidth: 680 }}>
        {/* Language — list row */}
        <div className="list-row">
          <span className="label">{t('set.language', lang)}</span>
          <div className="flex gap-2">
            {(['en', 'zh'] as Lang[]).map(l => (
              <button key={l} onClick={() => onLangChange(l)}
                className="btn-base btn-xs"
                style={{
                  color: lang === l ? 'var(--text-display)' : 'var(--text-secondary)',
                  backgroundColor: lang === l ? 'var(--text-display)' : 'transparent',
                  border: lang === l ? 'none' : '1px solid var(--border-visible)',
                }}>
                {l === 'en' ? 'EN' : 'ZH'}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance — dark/light toggle */}
        <div className="list-row">
          <span className="label">{t('set.appearance', lang)}</span>
          <button onClick={onToggleMode}
            className="toggle-track"
            data-on={mode === 'light'}>
            <div className="toggle-thumb" />
          </button>
        </div>

        {/* Monitoring status */}
        <div className="list-row">
          <span className="label">{t('set.monitoring', lang)}</span>
          <div className="flex items-center gap-3">
            <span className="label" style={{
              color: monStatus.running ? 'var(--success)' : 'var(--text-disabled)',
            }}>
              {monStatus.running
                ? `${t('set.active', lang)}${eventCount > 0 ? ` · ${eventCount}` : ''}`
                : t('set.paused', lang)}
            </span>
            <button onClick={handleToggle}
              className="btn-base btn-xs"
              style={{
                color: monStatus.running ? 'var(--accent)' : 'var(--text-secondary)',
                background: 'none',
                border: `1px solid ${monStatus.running ? 'var(--accent)' : 'var(--border-visible)'}`,
              }}>
              {monStatus.running ? t('set.stop', lang) : t('set.start', lang)}
            </button>
          </div>
        </div>

        {toggleErr && (
          <div className="label label-accent" style={{ padding: '8px 12px' }}>
            {toggleErr}
          </div>
        )}

        {monStatus.access_err && (
          <div className="list-row" style={{ borderBottom: 'none' }}>
            <span className="label label-warning">
              {t('set.accessWarn', lang)}
            </span>
            <button
              onClick={() => BrowserOpenURL('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')}
              className="btn-base btn-xs"
              style={{
                color: 'var(--text-display)',
                backgroundColor: 'var(--accent)',
                border: 'none',
              }}>
              {t('set.openSettings', lang)}
            </button>
          </div>
        )}

        {/* Test button — inline */}
        {monStatus.running && (
          <div className="list-row" style={{ borderBottom: 'none' }}>
            <span />
            <div className="flex items-center gap-2">
              <button onClick={handleTest} disabled={testing}
                className="btn-base btn-xs btn-secondary">
                {testing ? t('set.testing', lang) : t('set.testMonitor', lang)}
              </button>
              {testResult && (
                <span className="label" style={{
                  fontSize: 10,
                  color: testResult.success ? 'var(--success)' : 'var(--accent)',
                }}>
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

        {/* Configuration */}
        <div className="list-row">
          <div>
            <span className="label">{t('set.retention', lang)}</span>
            <div className="label-desc">{t('set.retentionDesc', lang)}</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={config.data_retention_days}
              onChange={e => setConfig({ ...config, data_retention_days: parseInt(e.target.value) || 90 })}
              className="nd-input tabular-nums"
              style={{ width: 60, textAlign: 'right', borderBottom: 'none' }} />
            <span className="label label-disabled">{t('set.days', lang)}</span>
          </div>
        </div>

        {/* Data directory */}
        <div className="list-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <span className="label">{t('set.dataDir', lang)}</span>
            <div className="label-desc">{t('set.dataDirDesc', lang)}</div>
          </div>
          <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
            <input type="text" value={config.data_dir || ''}
              onChange={e => setConfig({ ...config, data_dir: e.target.value })}
              placeholder={defaultDataDir}
              className="nd-input"
              style={{ flex: 1, minWidth: 0, fontSize: 11 }} />
            <button onClick={handlePickDirectory}
              className="btn-base btn-xs btn-secondary"
              style={{ flexShrink: 0 }}>
              Browse
            </button>
            {switchingDir && (
              <span className="label-desc" style={{ fontSize: 10 }}>[...]</span>
            )}
          </div>
        </div>

        <div className="bracket-legend" style={{ marginTop: -4, marginBottom: 8 }}>
          {t('set.dataDirDefault', lang)}: {defaultDataDir}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

        {/* Danger zone — accent border */}
        <div className="list-row" style={{ borderBottom: 'none' }}>
          <div>
            <span className="label label-accent">{t('set.uninstall', lang)}</span>
            <div className="label-desc">{t('set.uninstallDesc', lang)}</div>
          </div>
          <button onClick={() => setShowClearConfirm(v => !v)}
            className="btn-base btn-xs btn-destructive"
            style={{
              color: showClearConfirm ? '#fff' : 'var(--accent)',
              backgroundColor: showClearConfirm ? 'var(--accent)' : 'transparent',
            }}>
            {showClearConfirm ? t('common.cancel', lang) : t('set.uninstallBtn', lang)}
          </button>
        </div>

        {showClearConfirm && (
          <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="label label-accent">{t('set.uninstallTitle', lang)}</div>
              <div className="label-desc" style={{ fontSize: 10 }}>{t('set.uninstallModalDesc', lang)}</div>
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
              className="btn-base btn-xs"
              style={{
                color: '#fff',
                backgroundColor: 'var(--accent)',
                border: 'none',
              }}>
              {clearing ? '...' : t('set.confirmUninstall', lang)}
            </button>
          </div>
        )}

        {/* Keyboard debug — collapsible */}
        <div className="mt-6">
          <button onClick={() => setShowKbDebug(v => !v)}
            className="label label-disabled"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
            <span style={{ fontSize: 9, transition: 'transform 0.15s', transform: showKbDebug ? 'rotate(90deg)' : undefined }}>▶</span>
            Keyboard Debug
          </button>
          {showKbDebug && (
            <div className="mt-3">
              <KeyboardDebug lang={lang} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
