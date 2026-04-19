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
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--red-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
              {t('error.crashTitle', lang)}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              {t('error.crashDesc', lang)}
            </div>
          </div>
          {this.state.error && (
            <details className="max-w-sm w-full">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--muted)' }}>
                {t('error.details', lang)}
              </summary>
              <pre className="mt-2 p-3 rounded-lg text-[11px] font-mono overflow-auto max-h-32"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            {t('error.retry', lang)}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
