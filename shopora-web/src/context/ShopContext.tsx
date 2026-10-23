import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cartApi, wishlistApi } from '../api/endpoints';
import { messageOf } from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface ShopState {
  cartCount: number;
  wishlistCount: number;
  isInWishlist: (productId: number) => boolean;
  /** Returns true when the item was added. Sends visitors to the login page first. */
  addToCart: (productId: number, quantity?: number) => Promise<boolean>;
  toggleWishlist: (productId: number) => Promise<void>;
  refresh: () => Promise<void>;
  /** Lets the cart page update the header badge straight from an API response. */
  setCartCount: (count: number) => void;
}

const ShopContext = createContext<ShopState | null>(null);

/** Cart badge count and wishlist hearts for the signed-in customer. */
export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isCustomer = user?.role === 'Customer';

  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState<Map<number, number>>(new Map()); // productId -> wishlist item id

  const refresh = useCallback(async () => {
    if (!isCustomer) { setCartCount(0); setWishlist(new Map()); return; }
    try {
      const [cart, items] = await Promise.all([cartApi.get(), wishlistApi.list()]);
      setCartCount(cart.itemCount);
      setWishlist(new Map(items.map((i) => [i.product.id, i.id] as [number, number])));
    } catch { /* counts stay as they were; pages show their own errors */ }
  }, [isCustomer]);

  useEffect(() => { void refresh(); }, [refresh, user?.id]);

  /** Visitors go to login; admins get a hint. Returns true when the action may continue. */
  const allowed = useCallback((): boolean => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search, message: 'Please log in to continue.' } });
      return false;
    }
    if (!isCustomer) { toast.info('Admin accounts cannot shop. Sign in with a customer account.'); return false; }
    return true;
  }, [user, isCustomer, navigate, location, toast]);

  const addToCart = useCallback(async (productId: number, quantity = 1) => {
    if (!allowed()) return false;
    try {
      const cart = await cartApi.add(productId, quantity);
      setCartCount(cart.itemCount);
      toast.success('Added to cart');
      return true;
    } catch (e) {
      toast.error(messageOf(e));
      return false;
    }
  }, [allowed, toast]);

  const toggleWishlist = useCallback(async (productId: number) => {
    if (!allowed()) return;
    try {
      const existing = wishlist.get(productId);
      if (existing) {
        await wishlistApi.remove(existing);
        setWishlist((m) => { const n = new Map(m); n.delete(productId); return n; });
        toast.info('Removed from wishlist');
      } else {
        const item = await wishlistApi.add(productId);
        setWishlist((m) => new Map(m).set(productId, item.id));
        toast.success('Saved to wishlist');
      }
    } catch (e) {
      toast.error(messageOf(e));
    }
  }, [allowed, wishlist, toast]);

  const value = useMemo<ShopState>(() => ({
    cartCount,
    wishlistCount: wishlist.size,
    isInWishlist: (id) => wishlist.has(id),
    addToCart, toggleWishlist, refresh, setCartCount,
  }), [cartCount, wishlist, addToCart, toggleWishlist, refresh]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
