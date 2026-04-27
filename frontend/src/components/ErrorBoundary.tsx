import { Component } from 'react';
import type { ReactNode } from 'react';
import { t } from '../i18n';
import type { Lang } from '../i18n';

interface Props {
  children: ReactNode;
  lang: Lang;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { lang } = this.props;
      return (
        <div className="empty-state" style={{ minHeight: '50vh', padding: 24 }}>
          <div className="text-center">
            <div className="text-body" style={{ marginBottom: 4 }}>
              {t('error.crashTitle', lang)}
            </div>
            <div className="text-body-sm">
              {t('error.crashDesc', lang)}
            </div>
          </div>
          {this.state.error && (
            <details style={{ maxWidth: 480, width: '100%' }}>
              <summary className="label label-disabled" style={{ cursor: 'pointer' }}>
                {t('error.details', lang)}
              </summary>
              <pre className="text-mono" style={{
                marginTop: 8,
                padding: 16,
                borderRadius: 8,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 256,
                backgroundColor: 'var(--surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}>
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-base btn-sm btn-secondary">
            {t('error.retry', lang)}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
