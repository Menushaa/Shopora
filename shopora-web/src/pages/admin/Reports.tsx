import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../api/types';
import AdminPage from '../../components/admin/AdminPage';
import { LoadError, PageSpinner } from '../../components/Feedback';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

function StockTable({ title, items, empty, testId }: { title: string; items: Product[]; empty: string; testId: string }) {
  return (
    <section className="card" aria-labelledby={`${testId}-title`} data-testid={testId}>
      <h2 id={`${testId}-title`}>{title} <span className="muted">({items.length})</span></h2>
      {items.length === 0 ? <p className="muted">{empty}</p> : (
        <div className="table-wrap">
          <table className="table table--compact">
            <caption className="sr-only">{title}</caption>
            <thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="num">Stock</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}<br /><small className="muted">SKU {p.sku}</small></td>
                  <td>{p.categoryName}</td>
                  <td className="num"><span className={`stock ${p.stock === 0 ? 'stock--out' : 'stock--low'}`}>{p.stock}</span></td>
                  <td className="actions"><Link to={`/admin/products/${p.id}`} className="btn btn--outline btn--xs" aria-label={`Restock ${p.name}`}>Update</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Reports() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [range, setRange] = useState({ from: daysAgo(29), to: today() });
  const [rangeError, setRangeError] = useState('');

  const inventory = useAsync(() => adminApi.inventory(), []);
  const sales = useAsync(() => adminApi.sales(range.from, range.to), [range.from, range.to]);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (!from || !to) { setRangeError('Choose both a start and an end date.'); return; }
    if (from > to) { setRangeError("The 'From' date cannot be after the 'To' date."); return; }
    setRangeError('');
    setRange({ from, to });
  };

  const s = sales.data;
  const max = s ? Math.max(1, ...s.daily.map((d) => d.sales)) : 1;

  return (
    <AdminPage title="Reports" subtitle="Sales and stock at a glance. Sales count delivered orders only.">
      <h2 className="report-heading">Sales</h2>
      <form className="toolbar" onSubmit={apply} noValidate aria-label="Sales date range">
        <div className="field"><label htmlFor="r-from">From</label><input id="r-from" type="date" value={from} max={today()} onChange={(e) => setFrom(e.target.value)} data-testid="report-from" /></div>
        <div className="field"><label htmlFor="r-to">To</label><input id="r-to" type="date" value={to} max={today()} onChange={(e) => setTo(e.target.value)} data-testid="report-to" /></div>
        <div className="toolbar__actions"><button type="submit" className="btn btn--primary btn--sm" data-testid="report-apply">Show report</button></div>
        {rangeError && <p className="field__error toolbar__error" role="alert" data-testid="range-error">{rangeError}</p>}
      </form>

      {sales.loading && <PageSpinner label="Loading sales" />}
      {sales.error && <LoadError message={sales.error} onRetry={sales.reload} />}
      {s && !sales.loading && (
        <>
          <section className="stats" aria-label="Sales totals" data-testid="sales-totals">
            <div className="stat stat--hero"><span className="stat__value" data-testid="sales-total">{formatPrice(s.totalSales)}</span><span className="stat__label">Total sales</span></div>
            <div className="stat"><span className="stat__value" data-testid="sales-orders">{s.orderCount}</span><span className="stat__label">Delivered orders</span></div>
            <div className="stat"><span className="stat__value" data-testid="sales-items">{s.itemsSold}</span><span className="stat__label">Items sold</span></div>
          </section>
          <div className="two-col">
            <section className="card" aria-labelledby="daily-title">
              <h2 id="daily-title">Sales by day</h2>
              {s.daily.length === 0 ? <p className="muted">No delivered orders in this period.</p> : (
                <ul className="bars" data-testid="daily-sales">
                  {s.daily.map((d) => (
                    <li key={d.date}>
                      <span className="bars__label">{d.date}</span>
                      <span className="bars__track" aria-hidden="true"><span className="bars__fill" style={{ width: `${Math.max(3, (d.sales / max) * 100)}%` }} /></span>
                      <span className="bars__value">{formatPrice(d.sales)} <small className="muted">({d.orders} {d.orders === 1 ? 'order' : 'orders'})</small></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card" aria-labelledby="top-title">
              <h2 id="top-title">Top products</h2>
              {s.topProducts.length === 0 ? <p className="muted">Nothing sold in this period.</p> : (
                <ol className="top-list" data-testid="top-products">
                  {s.topProducts.map((t) => (
                    <li key={t.sku}><span><strong>{t.productName}</strong><br /><small className="muted">{t.unitsSold} sold</small></span><strong>{formatPrice(t.revenue)}</strong></li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}

      <h2 className="report-heading" style={{ marginTop: 40 }}>Inventory</h2>
      {inventory.loading && <PageSpinner label="Loading inventory" />}
      {inventory.error && <LoadError message={inventory.error} onRetry={inventory.reload} />}
      {inventory.data && (
        <>
          <p className="muted">{inventory.data.totalProducts} products in total. Low stock means {inventory.data.lowStockThreshold} units or fewer. Only active products are listed.</p>
          <div className="two-col">
            <StockTable testId="low-stock" title="Low stock" items={inventory.data.lowStock} empty="No products are running low." />
            <StockTable testId="out-of-stock" title="Out of stock" items={inventory.data.outOfStock} empty="Every active product is in stock." />
          </div>
        </>
      )}
    </AdminPage>
  );
}
