import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice } from '../../lib/format';
import AdminPage from '../../components/admin/AdminPage';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/StatusBadge';
import { LoadError, PageSpinner } from '../../components/Feedback';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(), []);

  return (
    <AdminPage title="Dashboard" subtitle="How the shop is doing right now."
      actions={<Link to="/admin/products/new" className="btn btn--primary btn--sm"><Plus size={16} aria-hidden="true" /> Add product</Link>}>
      {loading && <PageSpinner label="Loading the dashboard" />}
      {error && <LoadError message={error} onRetry={reload} />}
      {data && (
        <>
          <section className="stats stats--wide" aria-label="Summary" data-testid="admin-stats">
            <Link to="/admin/reports" className="stat stat--hero"><span className="stat__value" data-testid="stat-sales">{formatPrice(data.totalSales)}</span><span className="stat__label">Sales from delivered orders</span></Link>
            <Link to="/admin/orders" className="stat"><span className="stat__value" data-testid="stat-orders">{data.totalOrders}</span><span className="stat__label">Total orders</span></Link>
            <Link to="/admin/orders?status=Pending" className="stat"><span className="stat__value" data-testid="stat-pending">{data.pendingOrders}</span><span className="stat__label">Pending orders</span></Link>
            <Link to="/admin/orders?status=Delivered" className="stat"><span className="stat__value" data-testid="stat-completed">{data.completedOrders}</span><span className="stat__label">Completed orders</span></Link>
            <Link to="/admin/customers" className="stat"><span className="stat__value" data-testid="stat-customers">{data.totalCustomers}</span><span className="stat__label">Registered customers</span></Link>
            <Link to="/admin/products" className="stat"><span className="stat__value" data-testid="stat-products">{data.totalProducts}</span><span className="stat__label">Total products ({data.activeProducts} active)</span></Link>
            <Link to="/admin/products?stock=low" className="stat stat--warn"><span className="stat__value" data-testid="stat-low">{data.lowStockProducts}</span><span className="stat__label">Low stock (5 or fewer)</span></Link>
            <Link to="/admin/products?stock=out" className="stat stat--danger"><span className="stat__value" data-testid="stat-out">{data.outOfStockProducts}</span><span className="stat__label">Out of stock</span></Link>
          </section>

          <section className="card" aria-labelledby="recent-title" data-testid="admin-recent-orders">
            <div className="section__head">
              <h2 id="recent-title" style={{ margin: 0 }}>Latest orders</h2>
              <Link to="/admin/orders" className="link-strong">All orders</Link>
            </div>
            {data.recentOrders.length === 0 ? <p className="muted">No orders yet.</p> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col">Payment</th><th scope="col">Status</th><th scope="col" className="num">Total</th></tr></thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td><Link to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td>
                        <td>{o.customerName}</td>
                        <td>{formatDate(o.createdAt)}</td>
                        <td><PaymentStatusBadge status={o.paymentStatus} /></td>
                        <td><OrderStatusBadge status={o.status} /></td>
                        <td className="num">{formatPrice(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AdminPage>
  );
}
