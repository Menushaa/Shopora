import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { AdminUser } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import AdminPage, { ActiveBadge } from '../../components/admin/AdminPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

export default function CustomersAdmin() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status');
  const query = useMemo(() => ({
    search: params.get('search')?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    page: Math.max(1, Math.floor(Number(params.get('page'))) || 1),
    pageSize: 10,
  }), [params, status]);

  const [searchText, setSearchText] = useState(query.search ?? '');
  useEffect(() => setSearchText(query.search ?? ''), [query.search]);

  const list = useAsync(() => adminApi.users(query), [params.toString()]);
  const [patches, setPatches] = useState<Record<number, AdminUser>>({});
  const [toggling, setToggling] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (changes: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (!v || v === 'all') next.delete(k); else next.set(k, v); }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const toggle = async () => {
    if (!toggling) return;
    setBusy(true);
    try {
      const u = await adminApi.setUserStatus(toggling.id, !toggling.isActive);
      setPatches((p) => ({ ...p, [u.id]: { ...toggling, isActive: u.isActive } }));
      toast.success(u.isActive ? `${u.fullName} can log in again` : `${u.fullName} has been deactivated`);
    } catch (e) { toast.error(messageOf(e)); } finally { setBusy(false); setToggling(null); }
  };

  const data = list.data;
  const hasFilters = !!(query.search || status);

  return (
    <AdminPage title="Customers" subtitle="Everyone with a customer account. Passwords are never shown.">
      <form className="toolbar" role="search" aria-label="Filter customers" onSubmit={(e) => { e.preventDefault(); update({ search: searchText.trim() }); }}>
        <div className="field"><label htmlFor="c-search">Search by name or email</label>
          <input id="c-search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} data-testid="filter-search" /></div>
        <div className="field"><label htmlFor="c-status">Status</label>
          <select id="c-status" value={status ?? 'all'} onChange={(e) => update({ status: e.target.value })} data-testid="filter-status">
            <option value="all">All</option><option value="active">Active</option><option value="inactive">Deactivated</option>
          </select></div>
        <div className="toolbar__actions">
          <button type="submit" className="btn btn--primary btn--sm">Search</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams(new URLSearchParams())} disabled={!hasFilters}>Clear</button>
        </div>
      </form>

      {list.loading && <PageSpinner label="Loading customers" />}
      {list.error && <LoadError message={list.error} onRetry={list.reload} />}
      {data && data.items.length === 0 && !list.loading && <EmptyState title="No customers found">Try a different search.</EmptyState>}
      {data && data.items.length > 0 && !list.loading && (
        <>
          <p className="muted" role="status" data-testid="results-summary">{data.totalCount} {data.totalCount === 1 ? 'customer' : 'customers'}</p>
          <div className="table-wrap">
            <table className="table" data-testid="customers-table">
              <caption className="sr-only">Customers</caption>
              <thead><tr><th scope="col">Customer</th><th scope="col">Joined</th><th scope="col" className="num">Orders</th><th scope="col" className="num">Spent</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((row) => {
                  const u = patches[row.id] ?? row;
                  return (
                    <tr key={u.id} data-testid="customer-row">
                      <td><Link to={`/admin/customers/${u.id}`}><strong>{u.fullName}</strong></Link><br /><small className="muted">{u.email}</small></td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td className="num">{u.orderCount}</td>
                      <td className="num">{formatPrice(u.totalSpent)}</td>
                      <td><ActiveBadge active={u.isActive} yes="Active" no="Deactivated" /></td>
                      <td className="actions">
                        <Link to={`/admin/customers/${u.id}`} className="btn btn--outline btn--xs" aria-label={`View ${u.fullName}`}>View</Link>
                        <button type="button" className={`btn btn--xs ${u.isActive ? 'btn--danger-outline' : 'btn--outline'}`} onClick={() => setToggling(u)}
                          aria-label={`${u.isActive ? 'Deactivate' : 'Reactivate'} ${u.fullName}`} data-testid="toggle-status">{u.isActive ? 'Deactivate' : 'Reactivate'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(n) => update({ page: n === 1 ? undefined : String(n) }, false)} />
        </>
      )}

      <ConfirmDialog open={!!toggling} busy={busy} danger={!!toggling?.isActive}
        title={toggling?.isActive ? 'Deactivate this customer?' : 'Reactivate this customer?'}
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Reactivate'}
        message={toggling?.isActive
          ? <><strong>{toggling.fullName}</strong> will be signed out and will not be able to log in until reactivated. Their orders are kept.</>
          : <><strong>{toggling?.fullName}</strong> will be able to log in again.</>}
        onCancel={() => setToggling(null)} onConfirm={toggle} />
    </AdminPage>
  );
}
