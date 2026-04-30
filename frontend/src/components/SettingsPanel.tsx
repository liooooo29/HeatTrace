import { useEffect, useRef, useState } from 'react';
import { GetConfig, SaveConfig, GetMonitorStatus, ToggleMonitor, TestMonitor, GetEventCount, BrowserOpenURL, ClearAllData, Quit, GetDefaultDataDir, SwitchDataDir, PickDataDir, CheckForUpdate, GetVersion, OpenDownloadPage, type UpdateInfo } from '../wails-bindings';
import { ErrorPage } from './ErrorPage';
import { KeyboardDebug } from './KeyboardDebug';
import { SegmentedSpinner } from './SegmentedSpinner';
import { ThemeSelector } from './ThemeSelector';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { AppConfig } from '../types';
import type { ThemeMode } from '../themes';
import type { FontChoice } from '../hooks/useFont';
import type { FontSizeChoice } from '../hooks/useFontSize';
import type { LayoutId, KeyboardLayout } from '../hooks/useKeyboardLayout';
import { layoutList, sizeCategories } from '../data/keyboardLayouts';
import { KeyboardLayoutPreview } from './KeyboardLayoutPreview';

interface SettingsPanelProps {
  lang: Lang;
  onBack: () => void;
  mode: ThemeMode;
  resolved: 'dark' | 'light';
  onSetMode: (m: ThemeMode) => void;
  onLangChange: (lang: Lang) => void;
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  morphEnabled: boolean;
  morphPresetId: string;
  currentWpm: number;
  onToggleMorph: () => void;
  onSelectMorphPreset: (id: string) => void;
  font: FontChoice;
  onFontChange: (f: FontChoice) => void;
  fontSize: FontSizeChoice;
  onFontSizeChange: (s: FontSizeChoice) => void;
  layoutId: LayoutId;
  onLayoutChange: (id: LayoutId) => void;
  layout: KeyboardLayout;
}

export function SettingsPanel({ lang, onBack, mode, resolved, onSetMode, onLangChange, activePresetId, onSelectPreset, morphEnabled, morphPresetId, currentWpm, onToggleMorph, onSelectMorphPreset, font, onFontChange, fontSize, onFontSizeChange, layoutId, onLayoutChange, layout }: SettingsPanelProps) {
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
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const prevDataDirRef = useRef<string | null>(null);

  // Issue #3: track raw string for retention input so user can clear and retype
  const [retentionRaw, setRetentionRaw] = useState<string>('');
  const retentionFromBlur = useRef(false);

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
        if (cfg) setRetentionRaw(String(cfg.data_retention_days));
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
    (async () => {
      try {
        const ver = await GetVersion();
        setCurrentVersion(ver);
        const info = await CheckForUpdate();
        setUpdateInfo(info);
      } catch {}
    })();
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
    if (retentionFromBlur.current) {
      retentionFromBlur.current = false;
      return;
    }
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

  // Issue #3: validate retention on blur, not on every keystroke
  const handleRetentionBlur = () => {
    if (!config) return;
    const parsed = parseInt(retentionRaw);
    const valid = isNaN(parsed) || parsed < 1 ? 90 : parsed;
    setRetentionRaw(String(valid));
    if (valid !== config.data_retention_days) {
      retentionFromBlur.current = true;
      setConfig({ ...config, data_retention_days: valid });
      // Save immediately on blur
      SaveConfig({ ...config, data_retention_days: valid }).catch(() => {});
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

  const main = (
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

        {/* Issue #2: Appearance — segmented control with Auto/Dark/Light */}
        <div className="list-row">
          <span className="label">{t('set.appearance', lang)}</span>
          <div className="flex" style={{ border: '1px solid var(--border-visible)', borderRadius: 999, overflow: 'hidden' }}>
            {(['auto', 'dark', 'light'] as ThemeMode[]).map(m => {
              const isActive = mode === m;
              return (
                <button key={m} onClick={() => onSetMode(m)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 'var(--label-size)',
                    letterSpacing: '0.06em',
                    padding: '5px 14px',
                    background: isActive ? 'var(--text-display)' : 'transparent',
                    color: isActive ? 'var(--black)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}>
                  {t(`set.mode.${m}`, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font — Design vs System */}
        <div className="list-row">
          <span className="label">{t('set.font', lang)}</span>
          <div className="flex" style={{ border: '1px solid var(--border-visible)', borderRadius: 999, overflow: 'hidden' }}>
            {(['design', 'system'] as FontChoice[]).map(f => {
              const isActive = font === f;
              return (
                <button key={f} onClick={() => onFontChange(f)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 'var(--label-size)',
                    letterSpacing: '0.06em',
                    padding: '5px 14px',
                    background: isActive ? 'var(--text-display)' : 'transparent',
                    color: isActive ? 'var(--black)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}>
                  {t(`set.font${f === 'design' ? 'Design' : 'System'}`, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size — S / M / L */}
        <div className="list-row">
          <span className="label">{t('set.fontSize', lang)}</span>
          <div className="flex" style={{ border: '1px solid var(--border-visible)', borderRadius: 999, overflow: 'hidden' }}>
            {(['small', 'default', 'large'] as FontSizeChoice[]).map(s => {
              const isActive = fontSize === s;
              return (
                <button key={s} onClick={() => onFontSizeChange(s)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 'var(--label-size)',
                    letterSpacing: '0.06em',
                    padding: '5px 14px',
                    background: isActive ? 'var(--text-display)' : 'transparent',
                    color: isActive ? 'var(--black)' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}>
                  {t(`set.font${s === 'small' ? 'Small' : s === 'default' ? 'Default' : 'Large'}`, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Keyboard Layout — category selector + preview */}
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <span className="label">{t('set.keyboardLayout', lang)}</span>
          {/* Size category buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sizeCategories.map(cat => {
              const isActive = layout.category === cat.key;
              return (
                <button key={cat.key}
                  onClick={() => {
                    const first = layoutList.find(l => l.category === cat.key);
                    if (first) onLayoutChange(first.id as LayoutId);
                  }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: isActive ? 'var(--surface-raised)' : 'transparent',
                    color: isActive ? 'var(--text-display)' : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? 'var(--border-visible)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}>
                  {cat.label} <span style={{ opacity: 0.5 }}>{cat.desc}</span>
                </button>
              );
            })}
          </div>
          {/* Variant selector for current category (if multiple) */}
          {layoutList.filter(l => l.category === layout.category).length > 1 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {layoutList.filter(l => l.category === layout.category).map(item => {
                const isActive = layoutId === item.id;
                return (
                  <button key={item.id} onClick={() => onLayoutChange(item.id as LayoutId)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: '0.04em',
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: isActive ? 'var(--text-display)' : 'transparent',
                      color: isActive ? 'var(--black)' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                      whiteSpace: 'nowrap',
                    }}>
                    {item.name} ({item.keyCount})
                  </button>
                );
              })}
            </div>
          )}
          {/* Preview */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <KeyboardLayoutPreview layout={layout} keySize={20} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

        {/* Theme — presets + morph (full-width section) */}
        <div style={{ padding: '8px 0' }}>
          <ThemeSelector
            lang={lang}
            mode={resolved}
            activePresetId={activePresetId}
            morphEnabled={morphEnabled}
            morphPresetId={morphPresetId}
            currentWpm={currentWpm}
            onSelectPreset={onSelectPreset}
            onToggleMorph={onToggleMorph}
            onSelectMorphPreset={onSelectMorphPreset}
          />
        </div>

        {/* Update — hide for dev builds */}
        {updateInfo && currentVersion !== 'dev' && (
          <div className="list-row" style={{ borderBottom: 'none' }}>
            <div>
              <span className="label">{t('update.title', lang)}</span>
              <div className="label-desc">
                {updateInfo.available
                  ? t('update.available', lang).replace('{version}', updateInfo.version)
                  : currentVersion
                    ? t('update.uptodate', lang).replace('{version}', currentVersion)
                    : ''}
              </div>
            </div>
            {updateInfo.available && (
              <div className="flex items-center gap-2">
                {updateInfo.notes && (
                  <button onClick={() => setShowNotes(v => !v)}
                    className="btn-base btn-xs btn-secondary">
                    {t('update.releaseNotes', lang)}
                  </button>
                )}
                <button onClick={() => OpenDownloadPage(updateInfo.downloadUrl)}
                  className="btn-base btn-xs btn-primary">
                  {t('update.download', lang)}
                </button>
              </div>
            )}
          </div>
        )}
        {updateInfo?.available && showNotes && (
          <div style={{ padding: '0 12px 12px' }}>
            <div style={{
              fontSize: 'var(--label-size)',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflow: 'auto',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 6,
              border: '1px solid var(--border)',
            }}>
              {updateInfo.notes}
            </div>
          </div>
        )}

        {/* Monitoring — status + controls in one row */}
        <div className="list-row">
          <div>
            <span className="label">{t('set.monitoring', lang)}</span>
            <div className="label" style={{
              color: monStatus.running ? 'var(--success)' : 'var(--text-disabled)',
              marginTop: 2,
            }}>
              {monStatus.running
                ? `${t('set.active', lang)}${eventCount > 0 ? ` · ${eventCount}` : ''}`
                : t('set.paused', lang)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {monStatus.running && (
              <>
                <button onClick={handleTest} disabled={testing}
                  className="btn-base btn-xs btn-secondary">
                  {testing ? t('set.testing', lang) : t('set.testMonitor', lang)}
                </button>
                {testResult && (
                  <span className="label" style={{
                    color: testResult.success ? 'var(--success)' : 'var(--accent)',
                  }}>
                    {testResult.message}
                  </span>
                )}
              </>
            )}
            <button onClick={handleToggle}
              className={`btn-base btn-xs ${monStatus.running ? 'btn-destructive' : 'btn-secondary'}`}>
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
              className="btn-base btn-xs btn-primary">
              {t('set.openSettings', lang)}
            </button>
          </div>
        )}

        {/* Issue #3: Configuration — retention input validates on blur */}
        <div className="list-row">
          <div>
            <span className="label">{t('set.retention', lang)}</span>
            <div className="label-desc">{t('set.retentionDesc', lang)}</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={retentionRaw}
              onChange={e => setRetentionRaw(e.target.value)}
              onBlur={handleRetentionBlur}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="nd-input tabular-nums"
              style={{ width: 60, textAlign: 'right', borderBottom: 'none' }} />
            <span className="label label-disabled">{t('set.days', lang)}</span>
          </div>
        </div>

        {/* Data directory */}
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div>
            <span className="label">{t('set.dataDir', lang)}</span>
            <div className="label-desc">{t('set.dataDirDesc', lang)}</div>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="bracket-legend">
            {t('set.dataDirDefault', lang)}: {defaultDataDir}
          </div>
        </div>

        {/* Danger zone — Nothing Design: destructive button = accent outline */}
        <div className="list-row">
          <div>
            <span className="label">{t('set.uninstall', lang)}</span>
            <div className="label-desc">{t('set.uninstallDesc', lang)}</div>
          </div>
          <button onClick={() => setShowClearConfirm(v => !v)}
            className="btn-base btn-xs btn-destructive">
            {showClearConfirm ? t('common.cancel', lang) : t('set.uninstallBtn', lang)}
          </button>
        </div>

        {showClearConfirm && (
          <div className="list-row" style={{ borderBottom: 'none' }}>
            <div>
              <span className="label">{t('set.uninstallTitle', lang)}</span>
              <div className="label-desc">{t('set.uninstallModalDesc', lang)}</div>
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
              className="btn-base btn-xs btn-destructive">
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
              <KeyboardDebug lang={lang} layout={layout} />
            </div>
          )}
        </div>
      </div>

    </div>
  );

  return main;
}
