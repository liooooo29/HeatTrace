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
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#0C0A09' });
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
      <div className="skeleton h-96 mx-auto" style={{ maxWidth: 420 }} />
    </div>
  );

  if (!report) return (
    <div>
      <div className="mb-6"><h2 className="page-title">{t('report.title', lang)}</h2></div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>{t('report.noData', lang)}</div>
    </div>
  );

  const personaName = lang === 'zh' ? report.persona.name_zh : report.persona.name;
  const personaSlogan = lang === 'zh' ? report.persona.slogan_zh : report.persona.slogan;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="page-title">{t('report.title', lang)}</h2>
            <p className="page-subtitle">{report.start_date} — {report.end_date}</p>
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          style={{
            backgroundColor: exported ? 'var(--green-bg)' : 'var(--accent-bg)',
            color: exported ? 'var(--green)' : 'var(--accent)',
          }}>
          {exporting ? (
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          ) : exported ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          )}
          {exporting ? t('report.exporting', lang) : exported ? t('report.exported', lang) : t('report.export', lang)}
        </button>
      </div>

      {/* Card — wrapped so html-to-image captures full content */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={cardRef} style={{
          background: 'linear-gradient(135deg, #0C0A09 0%, #1C1917 50%, #0C0A09 100%)',
          borderRadius: 20,
          padding: '48px 40px',
          width: 420,
          border: `1px solid color-mix(in srgb, ${report.persona.color} 20%, var(--border))`,
        }}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #34D399)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: '#FAFAF9' }}>HeatTrace</span>
        </div>

        {/* Persona */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">{report.persona.emoji}</div>
          <div className="text-2xl font-bold mb-1" style={{ color: '#FAFAF9' }}>{personaName}</div>
          <div className="text-sm" style={{ color: '#A8A29E' }}>{personaSlogan}</div>
        </div>

        {/* 2 Big Stats */}
        <div className="flex justify-center gap-16 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums" style={{ color: '#FAFAF9', fontFamily: 'Fira Code' }}>
              {report.total_keys >= 1000 ? `${(report.total_keys / 1000).toFixed(1)}K` : report.total_keys}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider mt-1.5" style={{ color: '#78716C' }}>
              {t('report.cardKeys', lang)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums" style={{ color: '#FAFAF9', fontFamily: 'Fira Code' }}>
              {formatMinutes(report.active_minutes)}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider mt-1.5" style={{ color: '#78716C' }}>
              {t('report.cardActive', lang)}
            </div>
          </div>
        </div>

        {/* vs last week */}
        {report.prev_week && (report.prev_week.keys_delta !== 0 || report.prev_week.active_delta !== 0) && (
          <div className="text-center text-xs mb-6" style={{ color: '#A8A29E' }}>
            {report.prev_week.keys_delta !== 0 && (
              <span style={{ color: report.prev_week.keys_delta > 0 ? '#34D399' : '#F87171' }}>
                {report.prev_week.keys_delta > 0 ? '+' : ''}{report.prev_week.keys_delta}% {t('report.cardVsKeys', lang)}
              </span>
            )}
            {report.prev_week.keys_delta !== 0 && report.prev_week.active_delta !== 0 && (
              <span style={{ color: '#78716C' }}> · </span>
            )}
            {report.prev_week.active_delta !== 0 && (
              <span style={{ color: report.prev_week.active_delta > 0 ? '#34D399' : '#F87171' }}>
                {report.prev_week.active_delta > 0 ? '+' : ''}{report.prev_week.active_delta}% {t('report.cardVsActive', lang)}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <div className="text-center text-[10px] pt-5" style={{ color: '#78716C', borderTop: '1px solid var(--border)' }}>
          {report.start_date} — {report.end_date}
        </div>
      </div>
      </div>
    </div>
  );
}
