import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import type { AdminOrderQuery, OrderStatus } from '../../api/types';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import AdminPage from '../../components/admin/AdminPage';
import Pagination from '../../components/Pagination';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function OrdersAdmin() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const query = useMemo<AdminOrderQuery>(() => ({
    search: params.get('search')?.trim() || undefined,
    status: ORDER_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined,
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    page: Math.max(1, Math.floor(Number(params.get('page'))) || 1),
    pageSize: 10,
  }), [params, statusParam]);

  const [searchText, setSearchText] = useState(query.search ?? '');
  const [from, setFrom] = useState(query.from ?? '');
  const [to, setTo] = useState(query.to ?? '');
  const [dateError, setDateError] = useState('');
  useEffect(() => { setSearchText(query.search ?? ''); setFrom(query.from ?? ''); setTo(query.to ?? ''); setDateError(''); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useAsync(() => adminApi.orders(query), [params.toString()]);

  const update = (changes: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (!v || v === 'all') next.delete(k); else next.set(k, v); }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to && from > to) { setDateError("The 'From' date cannot be after the 'To' date."); return; }
    setDateError('');
    update({ search: searchText.trim(), from, to });
  };

  const data = list.data;
  const hasFilters = !!(query.search || query.status || query.from || query.to);

  return (
    <AdminPage title="Orders" subtitle="Search, filter and open any order.">
      <form className="toolbar" role="search" aria-label="Filter orders" onSubmit={apply} noValidate>
        <div className="field"><label htmlFor="o-search">Order number, name or email</label>
          <input id="o-search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} data-testid="filter-search" /></div>
        <div className="field"><label htmlFor="o-status">Status</label>
          <select id="o-status" value={query.status ?? 'all'} onChange={(e) => update({ status: e.target.value })} data-testid="filter-status">
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div className="field"><label htmlFor="o-from">From</label>
          <input id="o-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={dateError ? true : undefined} data-testid="filter-from" /></div>
        <div className="field"><label htmlFor="o-to">To</label>
          <input id="o-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={dateError ? true : undefined} data-testid="filter-to" /></div>
        <div className="toolbar__actions">
          <button type="submit" className="btn btn--primary btn--sm" data-testid="apply-filters">Apply</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams(new URLSearchParams())} disabled={!hasFilters}>Clear</button>
        </div>
        {dateError && <p className="field__error toolbar__error" role="alert" data-testid="date-error">{dateError}</p>}
      </form>

      {list.loading && <PageSpinner label="Loading orders" />}
      {list.error && <LoadError message={list.error} onRetry={list.reload} />}
      {data && data.items.length === 0 && !list.loading && <EmptyState title="No orders found">Try different filters.</EmptyState>}
      {data && data.items.length > 0 && !list.loading && (
        <>
          <p className="muted" role="status" data-testid="results-summary">{data.totalCount} {data.totalCount === 1 ? 'order' : 'orders'}</p>
          <div className="table-wrap">
            <table className="table" data-testid="orders-table">
              <caption className="sr-only">Orders</caption>
              <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col">Payment</th><th scope="col">Status</th><th scope="col" className="num">Total</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} data-testid="order-row">
                    <td><Link to={`/admin/orders/${o.id}`}><strong>{o.orderNumber}</strong></Link></td>
                    <td>{o.customerName}<br /><small className="muted">{o.customerEmail}</small></td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td><PaymentStatusBadge status={o.paymentStatus} /></td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="num">{formatPrice(o.total)}</td>
                    <td className="actions"><Link to={`/admin/orders/${o.id}`} className="btn btn--outline btn--xs" aria-label={`Open order ${o.orderNumber}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(n) => update({ page: n === 1 ? undefined : String(n) }, false)} />
        </>
      )}
    </AdminPage>
  );
}
