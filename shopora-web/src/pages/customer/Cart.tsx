import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { cartApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { Cart as CartModel, CartItem } from '../../api/types';
import { useShop } from '../../context/ShopContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { formatPrice } from '../../lib/format';
import AccountPage from '../../components/AccountPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import OrderSummary from '../../components/OrderSummary';
import ProductImage from '../../components/ProductImage';
import QuantityStepper from '../../components/QuantityStepper';
import { Alert, EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

function problem(item: CartItem): string | null {
  if (item.isAvailable) return null;
  if (item.stock === 0) return 'Out of stock';
  if (item.quantity > item.stock) return `Only ${item.stock} available`;
  return 'No longer available';
}

export default function Cart() {
  const navigate = useNavigate();
  const toast = useToast();
  const { setCartCount } = useShop();
  const { data, loading, error, reload } = useAsync(() => cartApi.get(), []);
  const [override, setOverride] = useState<CartModel | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const cart = override ?? data;
  const apply = (c: CartModel) => { setOverride(c); setCartCount(c.itemCount); };

  /** Runs one cart change. On failure, shows the server's message and reloads the true cart. */
  const run = async (key: string, action: () => Promise<CartModel>) => {
    setBusy(key);
    try {
      apply(await action());
    } catch (e) {
      toast.error(messageOf(e));
      try { apply(await cartApi.get()); } catch { /* keep what is on screen */ }
    } finally {
      setBusy(null);
    }
  };

  const hasProblem = !!cart?.items.some((i) => !i.isAvailable);

  return (
    <AccountPage title="My cart" subtitle={cart && cart.items.length > 0 ? `${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'} in your cart` : undefined}
      actions={cart && cart.items.length > 0 ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(true)} data-testid="clear-cart">
          <Trash2 size={16} aria-hidden="true" /> Clear cart
        </button>) : undefined}>
      {loading && <PageSpinner label="Loading your cart" />}
      {error && <LoadError message={error} onRetry={() => { setOverride(null); reload(); }} />}

      {cart && cart.items.length === 0 && (
        <EmptyState title="Your cart is empty" action={<Link to="/products" className="btn btn--primary">Continue shopping</Link>}>
          Find something you love and add it to your cart.
        </EmptyState>
      )}

      {cart && cart.items.length > 0 && (
        <div className="cart-layout">
          <div>
            {hasProblem && <Alert kind="error" testId="cart-problem">Some items in your cart are unavailable or have changed. Update or remove them to continue to checkout.</Alert>}
            <ul className="cart-list" data-testid="cart-list">
              {cart.items.map((item) => {
                const issue = problem(item);
                const rowBusy = busy === `item-${item.id}`;
                return (
                  <li key={item.id} className={`cart-row${issue ? ' cart-row--problem' : ''}`} data-testid="cart-item" aria-busy={rowBusy}>
                    <Link to={`/products/${item.productId}`} className="cart-row__img" tabIndex={-1} aria-hidden="true">
                      <ProductImage src={item.imageUrl} alt="" />
                    </Link>
                    <div className="cart-row__info">
                      <h3><Link to={`/products/${item.productId}`}>{item.name}</Link></h3>
                      <p className="cart-row__price">
                        {formatPrice(item.finalPrice)}
                        {item.discountPercent > 0 && <s className="price__was"> {formatPrice(item.unitPrice)}</s>}
                        <span className="muted"> each</span>
                      </p>
                      {issue && <p className="field__error" role="alert" data-testid="cart-item-problem">{issue}</p>}
                      <button type="button" className="link-btn" onClick={() => run(`item-${item.id}`, () => cartApi.remove(item.id))} disabled={!!busy}
                        data-testid="remove-item" aria-label={`Remove ${item.name} from cart`}>
                        <Trash2 size={15} aria-hidden="true" /> Remove
                      </button>
                    </div>
                    <div className="cart-row__qty">
                      <QuantityStepper value={item.quantity} max={Math.max(item.stock, 1)} label={item.name}
                        disabled={!!busy || item.stock === 0}
                        onChange={(q) => run(`item-${item.id}`, () => cartApi.update(item.id, q))} />
                    </div>
                    <p className="cart-row__total" data-testid="line-total"><span className="sr-only">Line total </span>{formatPrice(item.lineTotal)}</p>
                  </li>
                );
              })}
            </ul>
            <p style={{ marginTop: 20 }}><Link to="/products" className="link-strong">Continue shopping</Link></p>
          </div>

          <aside>
            <OrderSummary subtotal={cart.subtotal} discountTotal={cart.discountTotal} total={cart.total}>
              <p className="muted summary__note">Prices and totals are confirmed again when you place your order.</p>
            </OrderSummary>
            <button type="button" className="btn btn--primary btn--lg btn--block" disabled={hasProblem || !!busy} onClick={() => navigate('/checkout')} data-testid="proceed-checkout">
              Proceed to checkout
            </button>
          </aside>
        </div>
      )}

      <ConfirmDialog open={confirmClear} title="Clear your cart?" message="All items will be removed from your cart."
        confirmLabel="Clear cart" danger busy={busy === 'clear'}
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => { await run('clear', () => cartApi.clear()); setConfirmClear(false); }} />
    </AccountPage>
  );
}
