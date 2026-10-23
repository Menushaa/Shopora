import { Link } from 'react-router-dom';
import { Heart, Package, ShoppingBag, User as UserIcon, Store } from 'lucide-react';
import { catalogApi, meApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import { getRecentlyViewed } from '../../lib/recentlyViewed';
import AccountPage from '../../components/AccountPage';
import ProductCard from '../../components/ProductCard';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { LoadError, PageSpinner } from '../../components/Feedback';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => meApi.dashboard(), []);
  const recent = useAsync(async () => {
    const ids = getRecentlyViewed().slice(0, 4);
    const results = await Promise.allSettled(ids.map((id) => catalogApi.get(id)));
    return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  }, []);

  const first = (data?.fullName ?? user?.fullName ?? '').split(' ')[0];

  return (
    <AccountPage title={first ? `Welcome back, ${first}` : 'My dashboard'} subtitle="Here is a quick look at your account.">
      {loading && <PageSpinner label="Loading your dashboard" />}
      {error && <LoadError message={error} onRetry={reload} />}
      {data && (
        <>
          <section className="stats" aria-label="Account summary" data-testid="dashboard-stats">
            <Link to="/orders" className="stat"><span className="stat__value" data-testid="stat-orders">{data.totalOrders}</span><span className="stat__label">Total orders</span></Link>
            <Link to="/orders" className="stat"><span className="stat__value" data-testid="stat-pending">{data.pendingOrders}</span><span className="stat__label">Pending orders</span></Link>
            <Link to="/wishlist" className="stat"><span className="stat__value" data-testid="stat-wishlist">{data.wishlistCount}</span><span className="stat__label">Saved to wishlist</span></Link>
            <Link to="/cart" className="stat"><span className="stat__value" data-testid="stat-cart">{data.cartItemCount}</span><span className="stat__label">Items in cart</span></Link>
          </section>

          <div className="two-col dash-grid">
            <section className="card" aria-labelledby="recent-orders-title" data-testid="recent-orders">
              <div className="section__head">
                <h2 id="recent-orders-title" style={{ margin: 0 }}>Recent orders</h2>
                <Link to="/orders" className="link-strong">View all</Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <p className="muted">You have not placed any orders yet. <Link to="/products">Start shopping</Link></p>
              ) : (
                <ul className="mini-orders">
                  {data.recentOrders.map((o) => (
                    <li key={o.id}>
                      <Link to={`/orders/${o.id}`} className="mini-order" data-testid="recent-order">
                        <span><strong>{o.orderNumber}</strong><br /><small className="muted">{formatDate(o.createdAt)}</small></span>
                        <span className="mini-order__right"><OrderStatusBadge status={o.status} /><strong>{formatPrice(o.total)}</strong></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card card--tint" aria-labelledby="account-title">
              <h2 id="account-title">Your account</h2>
              <p style={{ marginBottom: 4 }}><strong>{user?.fullName}</strong></p>
              <p className="muted" style={{ marginBottom: 4 }}>{user?.email}</p>
              <p className="muted">Total spent on delivered orders: <strong>{formatPrice(data.totalSpent)}</strong></p>
              <div className="quick-links quick-links--tight" aria-label="Quick links">
                <Link to="/products"><Store size={18} aria-hidden="true" /> Products</Link>
                <Link to="/cart"><ShoppingBag size={18} aria-hidden="true" /> Cart</Link>
                <Link to="/wishlist"><Heart size={18} aria-hidden="true" /> Wishlist</Link>
                <Link to="/orders"><Package size={18} aria-hidden="true" /> My orders</Link>
                <Link to="/profile"><UserIcon size={18} aria-hidden="true" /> My profile</Link>
              </div>
            </section>
          </div>

          {recent.data && recent.data.length > 0 && (
            <section className="section" aria-labelledby="viewed-title" data-testid="recently-viewed">
              <div className="section__head"><h2 id="viewed-title">Recently viewed</h2></div>
              <div className="product-grid">{recent.data.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </section>
          )}

          {data.featured.length > 0 && (
            <section className="section" aria-labelledby="rec-title" data-testid="recommended">
              <div className="section__head"><h2 id="rec-title">Recommended for you</h2><Link to="/products" className="link-strong">See all</Link></div>
              <div className="product-grid">{data.featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            </section>
          )}
        </>
      )}
    </AccountPage>
  );
}
