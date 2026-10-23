import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { wishlistApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { WishlistItem } from '../../api/types';
import { useShop } from '../../context/ShopContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import AccountPage from '../../components/AccountPage';
import ProductImage from '../../components/ProductImage';
import { Price } from '../../components/Price';
import { EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

export default function Wishlist() {
  const toast = useToast();
  const { refresh, setCartCount } = useShop();
  const { data, loading, error, reload } = useAsync(() => wishlistApi.list(), []);
  const [removed, setRemoved] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const items = (data ?? []).filter((i) => !removed.includes(i.id));

  const remove = async (item: WishlistItem) => {
    setBusy(item.id);
    try {
      await wishlistApi.remove(item.id);
      setRemoved((r) => [...r, item.id]);
      toast.info('Removed from wishlist');
      void refresh();
    } catch (e) { toast.error(messageOf(e)); } finally { setBusy(null); }
  };

  const moveToCart = async (item: WishlistItem) => {
    setBusy(item.id);
    try {
      const cart = await wishlistApi.moveToCart(item.id);
      setCartCount(cart.itemCount);
      setRemoved((r) => [...r, item.id]);
      toast.success('Moved to your cart');
      void refresh();
    } catch (e) { toast.error(messageOf(e)); } finally { setBusy(null); }
  };

  return (
    <AccountPage title="My wishlist" subtitle="Products you have saved for later.">
      {loading && <PageSpinner label="Loading your wishlist" />}
      {error && <LoadError message={error} onRetry={reload} />}
      {data && items.length === 0 && (
        <EmptyState title="Your wishlist is empty" action={<Link to="/products" className="btn btn--primary">Browse products</Link>}>
          Tap the heart on any product to save it here.
        </EmptyState>
      )}
      {items.length > 0 && (
        <ul className="wish-grid" data-testid="wishlist-items">
          {items.map((item) => {
            const p = item.product;
            return (
              <li key={item.id} className="product-card" data-testid="wishlist-item">
                <div className="product-card__media">
                  <Link to={`/products/${p.id}`} tabIndex={-1} aria-hidden="true"><ProductImage src={p.imageUrl} alt="" /></Link>
                </div>
                <div className="product-card__body">
                  <p className="product-card__cat">{p.categoryName}</p>
                  <h3 className="product-card__name"><Link to={`/products/${p.id}`}>{p.name}</Link></h3>
                  <Price product={p} />
                  {!item.isAvailable && (
                    <p className="stock stock--out" data-testid="wishlist-unavailable">{p.isActive ? 'Out of stock' : 'No longer available'}</p>
                  )}
                  <div className="product-card__actions wish-actions">
                    <button type="button" className="btn btn--primary btn--sm" disabled={!item.isAvailable || busy === item.id}
                      onClick={() => moveToCart(item)} data-testid="move-to-cart">
                      <ShoppingBag size={16} aria-hidden="true" /> Move to cart
                    </button>
                    <button type="button" className="btn btn--outline btn--sm" disabled={busy === item.id} onClick={() => remove(item)}
                      aria-label={`Remove ${p.name} from wishlist`} data-testid="remove-wishlist">
                      <Heart size={16} fill="currentColor" aria-hidden="true" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountPage>
  );
}
