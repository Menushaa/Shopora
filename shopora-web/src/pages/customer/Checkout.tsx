import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, CreditCard } from 'lucide-react';
import { cartApi, meApi, ordersApi } from '../../api/endpoints';
import { ApiError, messageOf } from '../../api/client';
import type { AddressInput } from '../../api/types';
import { useShop } from '../../context/ShopContext';
import { useAsync } from '../../lib/useAsync';
import { formatPrice } from '../../lib/format';
import { checkoutSchema, emptyAddress, type AddressForm, type CheckoutForm } from '../../lib/validation';
import AccountPage from '../../components/AccountPage';
import AddressFields from '../../components/AddressFields';
import OrderSummary from '../../components/OrderSummary';
import { TextField } from '../../components/Fields';
import { Alert, EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const toInput = (a: AddressForm): AddressInput => ({ ...a, line2: a.line2 === '' ? null : a.line2 });

export default function Checkout() {
  const navigate = useNavigate();
  const { refresh } = useShop();
  const cart = useAsync(() => cartApi.get(), []);
  const addresses = useAsync(() => meApi.addresses(), []);
  const [formError, setFormError] = useState<string | null>(null);

  // One key per checkout visit: if the shopper double-clicks or retries, the server returns the same order.
  const idempotencyKey = useRef(newKey());

  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      addressChoice: '', saveAddress: true, newAddress: emptyAddress, paymentMethod: 'Card',
      card: { cardNumber: '', holderName: '', expiryMonth: '', expiryYear: '', cvv: '' },
    },
  });

  // Preselect the default saved address (or "new address" when there are none).
  useEffect(() => {
    if (!addresses.data) return;
    const preferred = addresses.data.find((a) => a.isDefault) ?? addresses.data[0];
    setValue('addressChoice', preferred ? String(preferred.id) : 'new');
  }, [addresses.data, setValue]);

  const choice = watch('addressChoice');
  const method = watch('paymentMethod');
  const saved = addresses.data ?? [];

  const showServerFields = (e: unknown, prefix = '') => {
    if (e instanceof ApiError && e.fields) {
      let mapped = false;
      for (const [key, msgs] of Object.entries(e.fields)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError(`${prefix}${key}` as any, { type: 'server', message: msgs[0] });
        mapped = true;
      }
      if (mapped) return;
    }
    setFormError(messageOf(e));
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    let addressId: number | undefined;
    let newAddress: AddressInput | undefined;

    if (v.addressChoice === 'new') {
      const input = toInput(v.newAddress);
      if (v.saveAddress) {
        try {
          addressId = (await meApi.addAddress({ ...input, isDefault: saved.length === 0 })).id;
        } catch (e) { showServerFields(e, 'newAddress.'); return; }
      } else {
        newAddress = input;
      }
    } else {
      addressId = Number(v.addressChoice);
    }

    try {
      const order = await ordersApi.checkout({
        addressId, newAddress, paymentMethod: v.paymentMethod, idempotencyKey: idempotencyKey.current,
        card: v.paymentMethod === 'Card'
          ? { cardNumber: v.card.cardNumber, holderName: v.card.holderName.trim(), expiryMonth: Number(v.card.expiryMonth), expiryYear: Number(v.card.expiryYear), cvv: v.card.cvv.trim() }
          : undefined,
      });
      await refresh();
      navigate(`/order-confirmation/${order.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && ['INSUFFICIENT_STOCK', 'PRODUCT_UNAVAILABLE', 'CART_EMPTY'].includes(e.code)) {
        setFormError(e.message);
        cart.reload();           // show the real cart so the shopper can fix it
        void refresh();
        return;
      }
      if (e instanceof ApiError && e.code.startsWith('PAYMENT_')) { setFormError(e.message); return; }
      showServerFields(e);
    }
  });

  const loading = cart.loading || addresses.loading;
  const error = cart.error ?? addresses.error;
  const c = cart.data;
  const unavailable = !!c?.items.some((i) => !i.isAvailable);

  return (
    <AccountPage title="Checkout" subtitle="Confirm where to send your order and how you would like to pay." hideNav>
      {loading && <PageSpinner label="Preparing checkout" />}
      {error && <LoadError message={error} onRetry={() => { cart.reload(); addresses.reload(); }} />}

      {c && c.items.length === 0 && !loading && (
        <EmptyState title="Your cart is empty" action={<Link to="/products" className="btn btn--primary">Continue shopping</Link>}>
          Add something to your cart before checking out.
        </EmptyState>
      )}

      {c && c.items.length > 0 && addresses.data && (
        <form onSubmit={onSubmit} noValidate aria-label="Checkout" className="checkout-layout">
          <div className="checkout-main">
            {formError && <Alert kind="error" testId="checkout-error">{formError}</Alert>}
            {unavailable && <Alert kind="error" testId="checkout-unavailable">Some items are unavailable. <Link to="/cart">Review your cart</Link> before placing your order.</Alert>}

            <fieldset className="panel">
              <legend><h2>Delivery address</h2></legend>
              {saved.map((a) => (
                <label key={a.id} className={`choice${choice === String(a.id) ? ' is-selected' : ''}`} data-testid="saved-address">
                  <input type="radio" value={String(a.id)} {...register('addressChoice')} />
                  <span>
                    <strong>{a.label}{a.isDefault && <span className="status status--brand" style={{ marginLeft: 8 }}>Default</span>}</strong>
                    <span className="choice__text">{a.fullName}, {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}<br />{a.phone}</span>
                  </span>
                </label>
              ))}
              <label className={`choice${choice === 'new' ? ' is-selected' : ''}`}>
                <input type="radio" value="new" {...register('addressChoice')} data-testid="address-new" />
                <span><strong>{saved.length > 0 ? 'Use a new address' : 'Enter your delivery address'}</strong></span>
              </label>
              {errors.addressChoice?.message && <p className="field__error" role="alert">{errors.addressChoice.message}</p>}

              {choice === 'new' && (
                <div className="choice__form">
                  <AddressFields register={register} errors={errors} prefix="newAddress." />
                  <label className="check"><input type="checkbox" {...register('saveAddress')} /> Save this address for next time</label>
                </div>
              )}
            </fieldset>

            <fieldset className="panel">
              <legend><h2>Payment</h2></legend>
              <label className={`choice${method === 'Card' ? ' is-selected' : ''}`}>
                <input type="radio" value="Card" {...register('paymentMethod')} data-testid="pay-card" />
                <span><strong><CreditCard size={17} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Card</strong><span className="choice__text">Simulated payment, no real money is taken.</span></span>
              </label>
              <label className={`choice${method === 'CashOnDelivery' ? ' is-selected' : ''}`}>
                <input type="radio" value="CashOnDelivery" {...register('paymentMethod')} data-testid="pay-cod" />
                <span><strong><Banknote size={17} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Cash on delivery</strong><span className="choice__text">Pay when your order arrives.</span></span>
              </label>

              {method === 'Card' && (
                <div className="choice__form" data-testid="card-form">
                  <Alert kind="info" testId="test-cards">
                    <strong>Test environment.</strong> Approved: 4111 1111 1111 1111. Declined: 4000 0000 0000 0002. Timeout: 4000 0000 0000 0069.
                    Use any future expiry date and any 3 digit CVV.
                  </Alert>
                  <TextField label="Card number" inputMode="numeric" autoComplete="cc-number" error={errors.card?.cardNumber?.message} {...register('card.cardNumber')} />
                  <TextField label="Name on card" autoComplete="cc-name" error={errors.card?.holderName?.message} {...register('card.holderName')} />
                  <div className="form-row form-row--3">
                    <TextField label="Expiry month" placeholder="MM" inputMode="numeric" autoComplete="cc-exp-month" error={errors.card?.expiryMonth?.message} {...register('card.expiryMonth')} />
                    <TextField label="Expiry year" placeholder="YYYY" inputMode="numeric" autoComplete="cc-exp-year" error={errors.card?.expiryYear?.message} {...register('card.expiryYear')} />
                    <TextField label="CVV" inputMode="numeric" autoComplete="cc-csc" error={errors.card?.cvv?.message} {...register('card.cvv')} />
                  </div>
                </div>
              )}
            </fieldset>
          </div>

          <aside className="checkout-side">
            <OrderSummary subtotal={c.subtotal} discountTotal={c.discountTotal} total={c.total} title="Your order">
              <ul className="summary__items" data-testid="checkout-items">
                {c.items.map((i) => (
                  <li key={i.id}><span>{i.name} <span className="muted">x {i.quantity}</span></span><span>{formatPrice(i.lineTotal)}</span></li>
                ))}
              </ul>
            </OrderSummary>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={isSubmitting || unavailable} data-testid="place-order">
              {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Placing your order' : `Place order ${formatPrice(c.total)}`}
            </button>
            <p className="muted summary__note" style={{ textAlign: 'center', marginTop: 12 }}><Link to="/cart">Back to cart</Link></p>
          </aside>
        </form>
      )}
    </AccountPage>
  );
}
