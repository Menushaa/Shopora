import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardList, LayoutDashboard, LogOut, Package, Store, Tags, Users } from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

/** The admin area has its own frame (sidebar), separate from the customer storefront. */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    toast.success('You have been logged out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin">
      <a href="#admin-main" className="skip-link">Skip to main content</a>
      <aside className="admin__side">
        <div className="admin__brand">
          <Logo light />
          <span className="admin__tag">Admin panel</span>
        </div>
        <nav aria-label="Admin">
          <ul className="admin__nav">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => `admin__link${isActive ? ' is-active' : ''}`}>
                  <Icon size={19} aria-hidden="true" /> <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin__foot">
          <p className="admin__user" title={user?.email}>{user?.fullName}</p>
          <Link to="/" className="admin__link"><Store size={19} aria-hidden="true" /> <span>View store</span></Link>
          <button type="button" className="admin__link" onClick={signOut} data-testid="logout"><LogOut size={19} aria-hidden="true" /> <span>Log out</span></button>
        </div>
      </aside>
      <main id="admin-main" className="admin__main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
