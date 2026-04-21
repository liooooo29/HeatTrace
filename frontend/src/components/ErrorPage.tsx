import { t } from '../i18n';
import type { Lang } from '../i18n';

interface ErrorPageProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  lang: Lang;
}

export function ErrorPage({ title, message, details, onRetry, lang }: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--red-bg)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
          {title || t('error.title', lang)}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          {message}
        </div>
      </div>
      {details && (
        <details className="max-w-lg w-full">
          <summary className="text-xs cursor-pointer" style={{ color: 'var(--muted)' }}>
            {t('error.details', lang)}
          </summary>
          <pre className="mt-2 p-4 rounded-lg text-[11px] font-mono overflow-auto max-h-64"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            {details}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {t('error.retry', lang)}
        </button>
      )}
    </div>
  );
}
