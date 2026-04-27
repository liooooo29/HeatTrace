import { useEffect, useState } from 'react';
import { GetConfig, SaveConfig, GetMonitorStatus, ToggleMonitor, TestMonitor, GetEventCount, BrowserOpenURL } from '../wails-bindings';
import { ErrorPage } from './ErrorPage';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { AppConfig } from '../types';

interface SettingsPanelProps {
  lang: Lang;
}

export function SettingsPanel({ lang }: SettingsPanelProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [monStatus, setMonStatus] = useState({ running: false, access_err: '' });
  const [toggleErr, setToggleErr] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function load() {
      try {
        const [cfg, status] = await Promise.all([GetConfig(), GetMonitorStatus()]);
        setConfig(cfg);
        setMonStatus(status);
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

  const handleSave = async () => {
    if (!config) return;
    try {
      await SaveConfig(config);
      const status = await GetMonitorStatus();
      setMonStatus(status);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save config:', e);
    }
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
      <div className="mb-6">
        <h2 className="page-title">{t('set.title', lang)}</h2>
        <p className="page-subtitle">{t('set.subtitle', lang)}</p>
      </div>

      <div className="max-w-lg space-y-4">
        {/* Monitor Control */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>{t('set.monitoring', lang)}</div>

          {/* Status + Toggle row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: monStatus.running ? 'var(--green-muted)' : 'var(--surface-2)' }}>
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
                  {monStatus.running ? t('set.tracking', lang) : t('set.trackingPaused', lang)}
                </div>
              </div>
            </div>
            <button onClick={handleToggle}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: monStatus.running ? 'var(--red-muted)' : 'var(--accent-muted)',
                color: monStatus.running ? 'var(--red)' : 'var(--accent)',
              }}>
              {monStatus.running ? t('set.stop', lang) : t('set.start', lang)}
            </button>
          </div>

          {/* Test & Event Count row — only when running */}
          {monStatus.running && (
            <div className="flex items-center gap-3 mb-3">
              <button onClick={handleTest} disabled={testing}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                style={{
                  backgroundColor: testing ? 'var(--surface-2)' : 'var(--accent-muted)',
                  color: 'var(--accent)',
                  opacity: testing ? 0.7 : 1,
                }}>
                {testing && (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
                {testing ? t('set.testing', lang) : t('set.testMonitor', lang)}
              </button>

              {eventCount > 0 && (
                <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--green)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="tabular-nums font-medium">{t('set.eventCount', lang)}: {eventCount}</span>
                </div>
              )}

              {testResult && !testResult.success && (
                <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--red)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span>{t('set.testFail', lang)}</span>
                </div>
              )}
            </div>
          )}

          {/* Test result banner */}
          {testResult && (
            <div className="text-xs px-3 py-2.5 rounded-lg flex items-center gap-2 mb-3"
              style={{
                backgroundColor: testResult.success ? 'var(--green-muted)' : 'var(--red-muted)',
                color: testResult.success ? 'var(--green)' : 'var(--red)',
              }}>
              {testResult.success ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}

          {/* Accessibility warning */}
          {monStatus.access_err && (
            <div className="text-xs px-3 py-2.5 rounded-lg flex items-center justify-between"
              style={{ backgroundColor: 'var(--amber-muted)', color: 'var(--amber)' }}>
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

          {toggleErr && (
            <div className="mt-3 text-xs px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--red-muted)', color: 'var(--red)' }}>
              {toggleErr}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--fg)' }}>{t('set.config', lang)}</div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--fg)' }}>{t('set.mouseInterval', lang)}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{t('set.mouseIntervalDesc', lang)}</div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={config.mouse_sample_interval_ms}
                  onChange={e => setConfig({ ...config, mouse_sample_interval_ms: parseInt(e.target.value) || 100 })}
                  className="w-20 rounded-lg px-3 py-1.5 text-sm border tabular-nums text-right"
                  style={inputStyle} />
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{t('common.ms', lang)}</span>
              </div>
            </label>

            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

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

            <label className="block">
              <div className="text-sm mb-1" style={{ color: 'var(--fg)' }}>{t('set.blacklist', lang)}</div>
              <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{t('set.blacklistDesc', lang)}</div>
              <textarea value={config.blacklisted_apps.join(', ')}
                onChange={e => setConfig({ ...config, blacklisted_apps: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm border resize-none"
                style={inputStyle} />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave}
          className="w-full py-2.5 rounded-lg text-sm font-semibold"
          style={{
            backgroundColor: saved ? 'var(--green-muted)' : 'var(--accent)',
            color: saved ? 'var(--green)' : '#fff',
            border: saved ? '1px solid color-mix(in srgb, var(--green) 30%, transparent)' : 'none',
          }}>
          {saved ? t('set.saved', lang) : t('set.save', lang)}
        </button>
      </div>
    </div>
  );
}
