import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { Order, OrderStatus } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice, percent } from '../../lib/format';
import AdminPage from '../../components/admin/AdminPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import OrderSummary from '../../components/OrderSummary';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { LoadError, PageSpinner } from '../../components/Feedback';
import NotFound from '../public/NotFound';

/** Mirrors the API's rules. The API checks them again and answers 409 for anything else. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
const LABEL: Record<OrderStatus, string> = {
  Pending: 'Pending', Confirmed: 'Confirm order', Processing: 'Start processing', Shipped: 'Mark as shipped', Delivered: 'Mark as delivered', Cancelled: 'Cancel order',
};
const NEEDS_CONFIRM: OrderStatus[] = ['Cancelled', 'Delivered'];

export default function OrderDetailAdmin() {
  const id = Number(useParams().id);
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminApi.order(id), [id]);
  const [override, setOverride] = useState<Order | null>(null);
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const order = override ?? data;

  const change = async (status: OrderStatus) => {
    setBusy(true);
    try {
      setOverride(await adminApi.updateOrderStatus(id, status));
      toast.success(`Order is now ${status}`);
    } catch (e) {
      toast.error(messageOf(e));
      setOverride(null);
      reload(); // show the true current status
    } finally { setBusy(false); setPending(null); }
  };

  if (loading && !order) return <AdminPage title="Order"><PageSpinner label="Loading order" /></AdminPage>;
  if (error?.toLowerCase().includes('not found')) return <NotFound title="We could not find that order" backTo="/admin/orders" backLabel="Back to orders" />;
  if (error || !order) return <AdminPage title="Order"><LoadError message={error ?? 'Unknown error'} onRetry={reload} /></AdminPage>;

  const a = order.shippingAddress;
  const options = NEXT[order.status];

  return (
    <AdminPage title={`Order ${order.orderNumber}`} subtitle={`Placed on ${formatDate(order.createdAt)}`} back={{ to: '/admin/orders', label: 'Back to orders' }}>
      <section className="card status-panel" aria-labelledby="status-title" data-testid="status-panel">
        <div>
          <h2 id="status-title">Order status</h2>
          <p style={{ margin: 0 }}><OrderStatusBadge status={order.status} /></p>
        </div>
        <div className="status-panel__actions">
          {options.length === 0 ? <p className="muted" style={{ margin: 0 }}>This order is {order.status.toLowerCase()} and can no longer be changed.</p> : options.map((s) => (
            <button key={s} type="button" className={`btn btn--sm ${s === 'Cancelled' ? 'btn--danger-outline' : 'btn--primary'}`} disabled={busy}
              onClick={() => (NEEDS_CONFIRM.includes(s) ? setPending(s) : change(s))} data-testid={`set-${s.toLowerCase()}`}>{LABEL[s]}</button>
          ))}
        </div>
      </section>

      <div className="cart-layout" style={{ marginTop: 20 }}>
        <div>
          <section className="card" aria-labelledby="items-title">
            <h2 id="items-title">Items</h2>
            <ul className="line-items" data-testid="order-items">
              {order.items.map((i) => (
                <li key={i.id} data-testid="order-item">
                  <div><strong>{i.productName}</strong> <small className="muted">SKU {i.sku}</small>
                    <p className="muted">{formatPrice(i.finalUnitPrice)} x {i.quantity}{i.discountPercent > 0 && <> ({percent(i.discountPercent)} off)</>}</p></div>
                  <strong>{formatPrice(i.lineTotal)}</strong>
                </li>
              ))}
            </ul>
          </section>
          <div className="two-col" style={{ marginTop: 20 }}>
            <section className="card" aria-labelledby="cust-title">
              <h2 id="cust-title">Customer</h2>
              <p style={{ marginBottom: 2 }}><strong data-testid="customer-name">{order.customerName}</strong></p>
              <p className="muted">{order.customerEmail}</p>
              <h3>Delivery address</h3>
              <address data-testid="order-address">{a.fullName}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{a.city} {a.postalCode}<br />{a.phone}</address>
            </section>
            <section className="card" aria-labelledby="pay-title">
              <h2 id="pay-title">Payment</h2>
              <dl className="facts facts--stack">
                <div><dt>Status</dt><dd><PaymentStatusBadge status={order.paymentStatus} /></dd></div>
                <div><dt>Method</dt><dd>{order.paymentMethod === 'CashOnDelivery' ? 'Cash on delivery' : 'Card'}</dd></div>
                {order.paymentReference && <div><dt>Reference</dt><dd>{order.paymentReference}</dd></div>}
                <div><dt>Amount</dt><dd>{formatPrice(order.total)}</dd></div>
              </dl>
            </section>
          </div>
        </div>
        <aside><OrderSummary subtotal={order.subtotal} discountTotal={order.discountTotal} total={order.total} title="Order total" /></aside>
      </div>

      <ConfirmDialog open={!!pending} busy={busy} danger={pending === 'Cancelled'}
        title={pending === 'Cancelled' ? 'Cancel this order?' : 'Mark as delivered?'}
        confirmLabel={pending === 'Cancelled' ? 'Yes, cancel order' : 'Mark as delivered'} cancelLabel="Go back"
        message={pending === 'Cancelled'
          ? <>Order <strong>{order.orderNumber}</strong> will be cancelled, its items returned to stock and any card payment refunded. This cannot be undone.</>
          : <>Order <strong>{order.orderNumber}</strong> will be marked as delivered. Delivered orders cannot be changed and count towards sales.</>}
        onCancel={() => setPending(null)} onConfirm={() => pending && change(pending)} />
    </AdminPage>
  );
}
