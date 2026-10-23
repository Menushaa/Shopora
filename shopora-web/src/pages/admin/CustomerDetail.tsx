import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { AdminUser } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import AdminPage, { ActiveBadge } from '../../components/admin/AdminPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { LoadError, PageSpinner } from '../../components/Feedback';
import NotFound from '../public/NotFound';

export default function CustomerDetail() {
  const id = Number(useParams().id);
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminApi.user(id), [id]);
  const [override, setOverride] = useState<AdminUser | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const user = override ?? data;

  const toggle = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const u = await adminApi.setUserStatus(user.id, !user.isActive);
      setOverride({ ...user, isActive: u.isActive });
      toast.success(u.isActive ? 'Customer reactivated' : 'Customer deactivated');
    } catch (e) { toast.error(messageOf(e)); } finally { setBusy(false); setConfirming(false); }
  };

  if (loading && !user) return <AdminPage title="Customer"><PageSpinner label="Loading customer" /></AdminPage>;
  if (error?.toLowerCase().includes('not found')) return <NotFound title="We could not find that customer" backTo="/admin/customers" backLabel="Back to customers" />;
  if (error || !user) return <AdminPage title="Customer"><LoadError message={error ?? 'Unknown error'} onRetry={reload} /></AdminPage>;

  return (
    <AdminPage title={user.fullName} subtitle={user.email} back={{ to: '/admin/customers', label: 'Back to customers' }}
      actions={<button type="button" className={`btn btn--sm ${user.isActive ? 'btn--danger-outline' : 'btn--primary'}`} onClick={() => setConfirming(true)} data-testid="toggle-status">
        {user.isActive ? 'Deactivate account' : 'Reactivate account'}</button>}>
      <div className="two-col">
        <section className="card" aria-labelledby="cust-title">
          <h2 id="cust-title">Account</h2>
          <dl className="facts facts--stack" data-testid="customer-facts">
            <div><dt>Status</dt><dd><ActiveBadge active={user.isActive} yes="Active" no="Deactivated" /></dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Address</dt><dd>{user.address}</dd></div>
            <div><dt>Joined</dt><dd>{formatDate(user.createdAt)}</dd></div>
            <div><dt>Orders</dt><dd>{user.orderCount}</dd></div>
            <div><dt>Total spent</dt><dd>{formatPrice(user.totalSpent)} <small className="muted">(delivered orders)</small></dd></div>
          </dl>
        </section>
        <section className="card" aria-labelledby="cust-orders-title">
          <h2 id="cust-orders-title">Recent orders</h2>
          {!user.recentOrders || user.recentOrders.length === 0 ? <p className="muted">This customer has not placed any orders.</p> : (
            <ul className="mini-orders">
              {user.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="mini-order">
                    <span><strong>{o.orderNumber}</strong><br /><small className="muted">{formatDate(o.createdAt)}</small></span>
                    <span className="mini-order__right"><OrderStatusBadge status={o.status} /><strong>{formatPrice(o.total)}</strong></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ConfirmDialog open={confirming} busy={busy} danger={user.isActive}
        title={user.isActive ? 'Deactivate this customer?' : 'Reactivate this customer?'} confirmLabel={user.isActive ? 'Deactivate' : 'Reactivate'}
        message={user.isActive ? <><strong>{user.fullName}</strong> will be signed out and cannot log in until reactivated.</> : <><strong>{user.fullName}</strong> will be able to log in again.</>}
        onCancel={() => setConfirming(false)} onConfirm={toggle} />
    </AdminPage>
  );
}
