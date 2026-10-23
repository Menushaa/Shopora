import type { ReactNode } from 'react';
import { formatPrice } from '../lib/format';

interface Props { subtotal: number; discountTotal: number; total: number; title?: string; children?: ReactNode }

/** Subtotal, discount and total. The numbers always come from the server. */
export default function OrderSummary({ subtotal, discountTotal, total, title = 'Order summary', children }: Props) {
  return (
    <section className="summary" aria-label={title}>
      <h2>{title}</h2>
      {children}
      <dl className="summary__rows">
        <div><dt>Subtotal</dt><dd data-testid="summary-subtotal">{formatPrice(subtotal)}</dd></div>
        {discountTotal > 0 && <div className="summary__discount"><dt>Discount</dt><dd data-testid="summary-discount">-{formatPrice(discountTotal)}</dd></div>}
        <div className="summary__total"><dt>Total</dt><dd data-testid="summary-total">{formatPrice(total)}</dd></div>
      </dl>
    </section>
  );
}
