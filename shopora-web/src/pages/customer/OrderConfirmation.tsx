import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { ordersApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import AccountPage from '../../components/AccountPage';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { LoadError, PageSpinner } from '../../components/Feedback';
import NotFound from '../public/NotFound';

export default function OrderConfirmation() {
  const id = Number(useParams().id);
  const { data: order, loading, error, reload } = useAsync(() => ordersApi.get(id), [id]);

  if (loading) return <PageSpinner label="Loading your order" />;
  if (error?.toLowerCase().includes('not found')) return <NotFound title="We could not find that order" backTo="/orders" backLabel="Go to my orders" />;
  if (error || !order) return <div className="container page"><LoadError message={error ?? 'Unknown error'} onRetry={reload} /></div>;

  const a = order.shippingAddress;
  return (
    <AccountPage title="Order confirmed" hideNav>
      <section className="confirm" data-testid="order-confirmation">
        <CheckCircle2 size={56} aria-hidden="true" className="confirm__icon" />
        <h2>Thank you, your order has been placed</h2>
        <p className="muted">We have received it and will keep you updated as it moves along.</p>
        <p className="confirm__number">Order number <strong data-testid="order-number">{order.orderNumber}</strong></p>

        <dl className="facts">
          <div><dt>Date</dt><dd>{formatDate(order.createdAt)}</dd></div>
          <div><dt>Status</dt><dd><OrderStatusBadge status={order.status} /></dd></div>
          <div><dt>Payment</dt><dd><PaymentStatusBadge status={order.paymentStatus} />{order.paymentMethod === 'CashOnDelivery' && <span className="muted"> Pay on delivery</span>}</dd></div>
          <div><dt>Total</dt><dd><strong data-testid="order-total">{formatPrice(order.total)}</strong></dd></div>
          <div><dt>Delivering to</dt><dd>{a.fullName}, {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}</dd></div>
        </dl>

        <div className="confirm__actions">
          <Link to={`/orders/${order.id}`} className="btn btn--primary">View order details</Link>
          <Link to="/products" className="btn btn--outline">Continue shopping</Link>
        </div>
      </section>
    </AccountPage>
  );
}
