import { Link, useSearchParams } from 'react-router-dom';
import { ordersApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import AccountPage from '../../components/AccountPage';
import Pagination from '../../components/Pagination';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  const { data, loading, error, reload } = useAsync(() => ordersApi.list(page, 8), [page]);

  return (
    <AccountPage title="My orders" subtitle="Every order you have placed, newest first.">
      {loading && <PageSpinner label="Loading your orders" />}
      {error && <LoadError message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState title="No orders yet" action={<Link to="/products" className="btn btn--primary">Start shopping</Link>}>
          When you place an order it will appear here.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <>
          <ul className="order-list" data-testid="order-list">
            {data.items.map((o) => {
              const names = o.items.slice(0, 2).map((i) => `${i.productName} x ${i.quantity}`).join(', ');
              const more = o.items.length > 2 ? ` and ${o.items.length - 2} more` : '';
              return (
                <li key={o.id} className="order-card" data-testid="order-card">
                  <div className="order-card__top">
                    <div>
                      <h2 className="order-card__no"><Link to={`/orders/${o.id}`}>{o.orderNumber}</Link></h2>
                      <p className="muted">Placed on {formatDate(o.createdAt)}</p>
                    </div>
                    <div className="order-card__badges"><OrderStatusBadge status={o.status} /><PaymentStatusBadge status={o.paymentStatus} /></div>
                  </div>
                  <p className="order-card__items">{names}{more}</p>
                  <div className="order-card__bottom">
                    <span className="muted">Delivering to {o.shippingAddress.city}</span>
                    <strong data-testid="order-total">{formatPrice(o.total)}</strong>
                    <Link to={`/orders/${o.id}`} className="btn btn--outline btn--sm">View details</Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages}
            onChange={(p) => { setParams(p === 1 ? {} : { page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      )}
    </AccountPage>
  );
}
