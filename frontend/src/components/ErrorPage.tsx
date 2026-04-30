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
    <div className="empty-state" style={{ minHeight: '50vh' }}>
      <div className="text-center">
        <div className="text-body" style={{ marginBottom: 4 }}>
          {title || t('error.title', lang)}
        </div>
        <div className="text-body-sm">
          {message}
        </div>
      </div>
      {details && (
        <details style={{ maxWidth: 480, width: '100%' }}>
          <summary className="label label-disabled" style={{ cursor: 'pointer' }}>
            {t('error.details', lang)}
          </summary>
          <pre className="text-mono" style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 8,
            fontSize: 'var(--label-size)',
            overflow: 'auto',
            maxHeight: 256,
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}>
            {details}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-base btn-sm btn-secondary">
          {t('error.retry', lang)}
        </button>
      )}
    </div>
  );
}
