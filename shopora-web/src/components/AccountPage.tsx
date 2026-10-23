import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders', label: 'My orders' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/cart', label: 'Cart' },
  { to: '/profile', label: 'Profile' },
  { to: '/addresses', label: 'Addresses' },
  { to: '/change-password', label: 'Password' },
];

interface Props { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; hideNav?: boolean }

/** Common frame for customer pages: account navigation, page title and optional action buttons. */
export default function AccountPage({ title, subtitle, actions, children, hideNav = false }: Props) {
  useDocumentTitle(title);
  return (
    <div className="container page">
      {!hideNav && (
        <nav aria-label="Account" className="subnav">
          <ul>
            {LINKS.map((l) => (
              <li key={l.to}><NavLink to={l.to} className={({ isActive }) => `subnav__link${isActive ? ' is-active' : ''}`}>{l.label}</NavLink></li>
            ))}
          </ul>
        </nav>
      )}
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
