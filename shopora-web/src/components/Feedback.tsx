import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, PackageSearch } from 'lucide-react';

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="page-spinner" role="status" aria-live="polite" data-testid="loading">
      <span className="spinner" aria-hidden="true" />
      <span>{label}...</span>
    </div>
  );
}

type AlertKind = 'error' | 'success' | 'info';
export function Alert({ kind = 'error', children, testId }: { kind?: AlertKind; children: ReactNode; testId?: string }) {
  const Icon = { error: AlertCircle, success: CheckCircle2, info: Info }[kind];
  return (
    <div className={`alert alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'} data-testid={testId ?? `alert-${kind}`}>
      <Icon size={20} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty" data-testid="empty-state">
      <PackageSearch size={44} aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Shows an error with a retry button when a page could not load. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty" data-testid="load-error">
      <AlertCircle size={44} aria-hidden="true" />
      <h2>We could not load this</h2>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn--primary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function ProductSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading products" data-testid="loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="product-card product-card--skeleton" key={i} aria-hidden="true">
          <div className="skeleton skeleton--media" />
          <div className="product-card__body">
            <div className="skeleton skeleton--line short" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
