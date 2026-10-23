import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

interface Props { title: string; subtitle?: string; actions?: ReactNode; back?: { to: string; label: string }; children: ReactNode }

/** Page heading, optional back link and action buttons for every admin page. */
export default function AdminPage({ title, subtitle, actions, back, children }: Props) {
  useDocumentTitle(`${title} (Admin)`);
  return (
    <div className="admin-page">
      {back && <p className="admin-page__back"><Link to={back.to}>{back.label}</Link></p>}
      <div className="page__head page__head--row">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function ActiveBadge({ active, yes = 'Active', no = 'Inactive' }: { active: boolean; yes?: string; no?: string }) {
  return <span className={`status ${active ? 'status--success' : 'status--danger'}`} data-testid="active-status">{active ? yes : no}</span>;
}
