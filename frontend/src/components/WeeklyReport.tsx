import { useEffect, useState, useRef, useCallback } from 'react';
import { GetWeeklyReport, SaveReportImage } from '../wails-bindings';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { WeeklyReport as WeeklyReportType } from '../types';
import heattraceIconDark from '../assets/images/heattrace-icon.png';
import heattraceIconLight from '../assets/images/heattrace-icon-light.png';

export function WeeklyReport({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [report, setReport] = useState<WeeklyReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    GetWeeklyReport().then(setReport).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const base64 = dataUrl.split(',')[1];
      if (await SaveReportImage(base64)) {
        setExported(true);
        setTimeout(() => setExported(false), 2000);
      }
    } catch (e) { console.error('Export failed:', e); }
    setExporting(false);
  }, []);

  const formatMinutes = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  if (loading) return (
    <div>
      <div className="mb-6"><h2 className="page-title">{t('report.title', lang)}</h2></div>
      <div className="loading-text">[LOADING...]</div>
    </div>
  );

  if (!report) return (
    <div>
      <div className="mb-6"><h2 className="page-title">{t('report.title', lang)}</h2></div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('report.noData', lang)}</div>
    </div>
  );

  const personaName = lang === 'zh' ? report.persona.name_zh : report.persona.name;
  const personaSlogan = lang === 'zh' ? report.persona.slogan_zh : report.persona.slogan;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="page-title">{t('report.title', lang)}</h2>
            <p className="page-subtitle">{report.start_date} — {report.end_date}</p>
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="btn-base btn-sm btn-secondary"
          style={{
            color: exported ? 'var(--success)' : 'var(--text-secondary)',
            borderColor: exported ? 'var(--success)' : undefined,
          }}>
          {exporting ? t('report.exporting', lang) : exported ? t('report.exported', lang) : t('report.export', lang)}
        </button>
      </div>

      {/* Share card — horizontal layout */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={cardRef} style={{
          background: isDark ? '#000000' : '#FFFFFF',
          borderRadius: 16,
          padding: '28px 32px',
          width: 500,
          border: `1px solid ${isDark ? '#222222' : '#E8E8E8'}`,
        }}>
          {/* Logo + Date row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="flex items-center gap-2">
              <img src={isDark ? heattraceIconDark : heattraceIconLight} alt="HeatTrace" width={16} height={16} style={{ borderRadius: 3 }} />
              <span style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: isDark ? '#FFFFFF' : '#000000',
              }}>HeatTrace</span>
            </div>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: isDark ? '#666666' : '#999999',
              letterSpacing: '0.05em',
            }}>
              {report.start_date} — {report.end_date}
            </span>
          </div>

          {/* Main row: Persona left + Stats right */}
          <div style={{ display: 'flex', gap: 28, marginBottom: 0 }}>
            {/* Left: Persona */}
            <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundImage: `radial-gradient(circle, ${isDark ? '#333333' : '#CCCCCC'} 1px, transparent 1px)`,
                backgroundSize: '8px 8px',
                backgroundColor: isDark ? '#111111' : '#F0F0F0',
                border: `1px solid ${isDark ? '#222222' : '#E8E8E8'}`,
                margin: '0 auto 12px',
              }}>
                <span style={{ fontSize: 30, lineHeight: 1 }}>
                  {report.persona.emoji}
                </span>
              </div>
              <div style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 16,
                fontWeight: 500,
                color: isDark ? '#FFFFFF' : '#000000',
                marginBottom: 4,
              }}>{personaName}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: isDark ? '#666666' : '#999999',
                lineHeight: '15px',
              }}>{personaSlogan}</div>
            </div>

            {/* Vertical divider */}
            <div style={{
              width: 1,
              background: isDark ? '#222222' : '#E8E8E8',
              flexShrink: 0,
              alignSelf: 'stretch',
            }} />

            {/* Right: Stats 2x2 */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px', alignContent: 'center' }}>
              {[
                { value: report.total_keys >= 1000 ? `${(report.total_keys / 1000).toFixed(1)}K` : String(report.total_keys), label: t('report.cardKeys', lang), delta: report.prev_week?.keys_delta },
                { value: String(report.total_clicks), label: t('report.clicks', lang), delta: report.prev_week?.clicks_delta },
                { value: formatMinutes(report.active_minutes), label: t('report.cardActive', lang), delta: report.prev_week?.active_delta },
                { value: report.avg_wpm > 0 ? `${Math.round(report.avg_wpm)}` : '—', label: t('report.wpm', lang), delta: report.prev_week?.wpm_delta },
              ].map((stat, i) => (
                <div key={i}>
                  <div style={{
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    fontSize: 22,
                    fontWeight: 500,
                    color: isDark ? '#FFFFFF' : '#000000',
                    lineHeight: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    color: isDark ? '#666666' : '#999999',
                    marginTop: 4,
                    letterSpacing: '0.03em',
                  }}>
                    {stat.label}
                  </div>
                  {stat.delta !== undefined && stat.delta !== 0 && (
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      marginTop: 2,
                      color: stat.delta > 0 ? 'var(--success)' : 'var(--accent)',
                    }}>
                      {stat.delta > 0 ? '+' : ''}{stat.delta}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Insights — 2-column grid, orphan spans full width */}
          {report.insights && report.insights.length > 0 && (
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${isDark ? '#222222' : '#E8E8E8'}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 24px',
              alignItems: 'start',
            }}>
              {report.insights.map((insight, i) => (
                <div key={i} style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: isDark ? '#666666' : '#999999',
                  lineHeight: '18px',
                  letterSpacing: '0.02em',
                  gridColumn: i === report.insights.length - 1 ? '1 / -1' : undefined,
                }}>
                  {lang === 'zh' ? insight.text_zh : insight.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
