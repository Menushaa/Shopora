import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { ordersApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { Order, OrderStatus } from '../../api/types';
import { useShop } from '../../context/ShopContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice, percent } from '../../lib/format';
import AccountPage from '../../components/AccountPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import OrderSummary from '../../components/OrderSummary';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { Alert, LoadError, PageSpinner } from '../../components/Feedback';
import NotFound from '../public/NotFound';

const STEPS: OrderStatus[] = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

export default function OrderDetails() {
  const id = Number(useParams().id);
  const toast = useToast();
  const { refresh } = useShop();
  const { data, loading, error, reload } = useAsync(() => ordersApi.get(id), [id]);
  const [override, setOverride] = useState<Order | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const order = override ?? data;

  const cancel = async () => {
    setCancelling(true);
    try {
      setOverride(await ordersApi.cancel(id));
      toast.success('Your order has been cancelled');
      void refresh();
    } catch (e) {
      toast.error(messageOf(e));
      setOverride(null);
      reload(); // show the order's real, current status
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  };

  if (loading && !order) return <PageSpinner label="Loading your order" />;
  if (error?.toLowerCase().includes('not found')) return <NotFound title="We could not find that order" message="It may belong to a different account." backTo="/orders" backLabel="Go to my orders" />;
  if (error || !order) return <div className="container page"><LoadError message={error ?? 'Unknown error'} onRetry={reload} /></div>;

  const a = order.shippingAddress;
  const cancelled = order.status === 'Cancelled';
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <AccountPage title={`Order ${order.orderNumber}`} subtitle={`Placed on ${formatDate(order.createdAt)}`}
      actions={order.canCancel ? <button type="button" className="btn btn--outline btn--sm btn--danger-outline" onClick={() => setConfirming(true)} data-testid="cancel-order">Cancel order</button> : undefined}>
      <p><Link to="/orders">Back to my orders</Link></p>

      {cancelled ? (
        <Alert kind="info" testId="order-cancelled">This order was cancelled. Any items were returned to stock{order.paymentStatus === 'Refunded' ? ' and your payment has been refunded' : ''}.</Alert>
      ) : (
        <ol className="tracker" aria-label="Order progress" data-testid="order-tracker">
          {STEPS.map((s, i) => (
            <li key={s} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
              <span className="tracker__dot">{i < stepIndex ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
              <span className="tracker__label">{s}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="cart-layout">
        <div>
          <section className="card" aria-labelledby="items-title">
            <h2 id="items-title">Items</h2>
            <ul className="line-items" data-testid="order-items">
              {order.items.map((i) => (
                <li key={i.id} data-testid="order-item">
                  <div>
                    <Link to={`/products/${i.productId}`}><strong>{i.productName}</strong></Link>
                    <p className="muted">
                      {formatPrice(i.finalUnitPrice)} x {i.quantity}
                      {i.discountPercent > 0 && <> ({percent(i.discountPercent)} off)</>}
                    </p>
                  </div>
                  <strong>{formatPrice(i.lineTotal)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <div className="two-col" style={{ marginTop: 20 }}>
            <section className="card" aria-labelledby="ship-title">
              <h2 id="ship-title">Delivery address</h2>
              <address data-testid="order-address">
                {a.fullName}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{a.city} {a.postalCode}<br />{a.phone}
              </address>
            </section>
            <section className="card" aria-labelledby="pay-title">
              <h2 id="pay-title">Status and payment</h2>
              <dl className="facts facts--stack">
                <div><dt>Order status</dt><dd><OrderStatusBadge status={order.status} /></dd></div>
                <div><dt>Payment status</dt><dd><PaymentStatusBadge status={order.paymentStatus} /></dd></div>
                <div><dt>Method</dt><dd>{order.paymentMethod === 'CashOnDelivery' ? 'Cash on delivery' : 'Card'}</dd></div>
                {order.paymentReference && <div><dt>Reference</dt><dd>{order.paymentReference}</dd></div>}
              </dl>
            </section>
          </div>
        </div>

        <aside><OrderSummary subtotal={order.subtotal} discountTotal={order.discountTotal} total={order.total} title="Order total" /></aside>
      </div>

      <ConfirmDialog open={confirming} title="Cancel this order?" confirmLabel="Yes, cancel order" cancelLabel="Keep order" danger busy={cancelling}
        message={<>Order <strong>{order.orderNumber}</strong> will be cancelled and the items returned to stock. This cannot be undone.</>}
        onCancel={() => setConfirming(false)} onConfirm={cancel} />
    </AccountPage>
  );
}
