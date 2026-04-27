import { useEffect, useState, useRef, useCallback } from 'react';
import { GetWeeklyReport, SaveReportImage } from '../wails-bindings';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import type { WeeklyReport as WeeklyReportType } from '../types';

export function WeeklyReport({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const [report, setReport] = useState<WeeklyReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    GetWeeklyReport().then(setReport).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#000000' });
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

      {/* Share card — Nothing style: pure black, minimal */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={cardRef} style={{
          background: '#000000',
          borderRadius: 16,
          padding: '48px 40px',
          width: 420,
          border: '1px solid #222222',
        }}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
            }}>HeatTrace</span>
          </div>

          {/* Persona */}
          <div className="text-center mb-10">
            {/* Doto initial with dot-grid background */}
            <div style={{
              width: 72, height: 72, margin: '0 auto 16px',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundImage: 'radial-gradient(circle, #333333 1px, transparent 1px)',
              backgroundSize: '8px 8px',
              backgroundColor: '#111111',
              border: '1px solid #222222',
            }}>
              <span style={{
                fontFamily: "'Doto', 'Space Mono', monospace",
                fontSize: 36,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
              }}>{personaName.charAt(0)}</span>
            </div>
            <div style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 22,
              fontWeight: 500,
              color: '#FFFFFF',
              marginBottom: 4,
            }}>{personaName}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              color: '#666666',
            }}>{personaSlogan}</div>
          </div>

          {/* 2 Big Stats */}
          <div className="flex justify-center gap-16 mb-6">
            <div className="text-center">
              <div className="display-md" style={{ color: '#FFFFFF' }}>
                {report.total_keys >= 1000 ? `${(report.total_keys / 1000).toFixed(1)}K` : report.total_keys}
              </div>
              <div className="label" style={{ color: '#666666', marginTop: 6 }}>
                {t('report.cardKeys', lang)}
              </div>
            </div>
            <div className="text-center">
              <div className="display-md" style={{ color: '#FFFFFF' }}>
                {formatMinutes(report.active_minutes)}
              </div>
              <div className="label" style={{ color: '#666666', marginTop: 6 }}>
                {t('report.cardActive', lang)}
              </div>
            </div>
          </div>

          {/* vs last week */}
          {report.prev_week && (report.prev_week.keys_delta !== 0 || report.prev_week.active_delta !== 0) && (
            <div className="text-center" style={{ fontSize: 12, color: '#999999', marginBottom: 24 }}>
              {report.prev_week.keys_delta !== 0 && (
                <span style={{ color: report.prev_week.keys_delta > 0 ? 'var(--success)' : 'var(--accent)' }}>
                  {report.prev_week.keys_delta > 0 ? '+' : ''}{report.prev_week.keys_delta}% {t('report.cardVsKeys', lang)}
                </span>
              )}
              {report.prev_week.keys_delta !== 0 && report.prev_week.active_delta !== 0 && (
                <span style={{ color: '#666666' }}> · </span>
              )}
              {report.prev_week.active_delta !== 0 && (
                <span style={{ color: report.prev_week.active_delta > 0 ? 'var(--success)' : 'var(--accent)' }}>
                  {report.prev_week.active_delta > 0 ? '+' : ''}{report.prev_week.active_delta}% {t('report.cardVsActive', lang)}
                </span>
              )}
            </div>
          )}

          {/* Date */}
          <div className="text-center bracket-legend" style={{
            color: '#666666',
            paddingTop: 20,
            borderTop: '1px solid #222222',
          }}>
            {report.start_date} — {report.end_date}
          </div>
        </div>
      </div>
    </div>
  );
}
