import type { OrderStatus, PaymentStatus } from '../api/types';

const ORDER_TONE: Record<OrderStatus, string> = {
  Pending: 'warning', Confirmed: 'info', Processing: 'info', Shipped: 'brand', Delivered: 'success', Cancelled: 'danger',
};
const PAYMENT_TONE: Record<PaymentStatus, string> = {
  Pending: 'warning', Paid: 'success', Failed: 'danger', Refunded: 'info',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status status--${ORDER_TONE[status]}`} data-testid="order-status">{status}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`status status--${PAYMENT_TONE[status]}`} data-testid="payment-status">{status}</span>;
}
