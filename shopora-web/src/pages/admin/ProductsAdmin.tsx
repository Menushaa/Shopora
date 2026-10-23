import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Power } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { AdminProductQuery, Product } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { formatPrice, percent } from '../../lib/format';
import { stockError } from '../../lib/validation';
import AdminPage, { ActiveBadge } from '../../components/admin/AdminPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import ProductImage from '../../components/ProductImage';
import { EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

const toNum = (v: string | null) => { const n = Number(v); return v && Number.isFinite(n) ? n : undefined; };

/** Shows the stock number; click "Edit" to change it right in the table. */
function StockCell({ product, onSaved }: { product: Product; onSaved: (p: Product) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(product.stock));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const problem = stockError(text);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      onSaved(await adminApi.setProductStock(product.id, Number(text)));
      toast.success(`Stock updated for ${product.name}`);
      setEditing(false); setError(null);
    } catch (err) { setError(messageOf(err)); } finally { setSaving(false); }
  };

  if (!editing) {
    const tone = product.stock === 0 ? 'stock--out' : product.stock <= 5 ? 'stock--low' : '';
    return (
      <div className="stock-cell">
        <span className={`stock ${tone}`} data-testid="stock-value">{product.stock}</span>
        <button type="button" className="link-btn" onClick={() => { setText(String(product.stock)); setEditing(true); }} aria-label={`Edit stock for ${product.name}`} data-testid="edit-stock">Edit</button>
      </div>
    );
  }
  return (
    <form className="stock-cell stock-cell--edit" onSubmit={save} noValidate>
      <label className="sr-only" htmlFor={`stock-${product.id}`}>Stock for {product.name}</label>
      <input id={`stock-${product.id}`} className="input input--sm" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)}
        aria-invalid={error ? true : undefined} data-testid="stock-input" autoFocus />
      <button type="submit" className="btn btn--primary btn--xs" disabled={saving} data-testid="save-stock">Save</button>
      <button type="button" className="btn btn--ghost btn--xs" onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
      {error && <p className="field__error" role="alert" data-testid="stock-error">{error}</p>}
    </form>
  );
}

export default function ProductsAdmin() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const query = useMemo<AdminProductQuery>(() => ({
    search: params.get('search')?.trim() || undefined,
    categoryId: toNum(params.get('categoryId')),
    status: (['active', 'inactive'].includes(params.get('status') ?? '') ? params.get('status') : 'all') as AdminProductQuery['status'],
    stock: (['low', 'out'].includes(params.get('stock') ?? '') ? params.get('stock') : 'all') as AdminProductQuery['stock'],
    sort: 'newest',
    page: Math.max(1, Math.floor(toNum(params.get('page')) ?? 1)),
    pageSize: 10,
  }), [params]);

  const [searchText, setSearchText] = useState(query.search ?? '');
  useEffect(() => setSearchText(query.search ?? ''), [query.search]);

  const list = useAsync(() => adminApi.products(query), [params.toString()]);
  const cats = useAsync(() => adminApi.categories(), []);
  const [patches, setPatches] = useState<Record<number, Product>>({});
  const [toggling, setToggling] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (changes: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (!v || v === 'all') next.delete(k); else next.set(k, v); }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const toggle = async () => {
    if (!toggling) return;
    setBusy(true);
    try {
      const updated = await adminApi.setProductStatus(toggling.id, !toggling.isActive);
      setPatches((p) => ({ ...p, [updated.id]: updated }));
      toast.success(updated.isActive ? `${updated.name} is now active` : `${updated.name} has been deactivated`);
    } catch (e) { toast.error(messageOf(e)); } finally { setBusy(false); setToggling(null); }
  };

  const data = list.data;
  const hasFilters = !!(query.search || query.categoryId || query.status !== 'all' || query.stock !== 'all');

  return (
    <AdminPage title="Products" subtitle="Add, edit, price and stock every product."
      actions={<Link to="/admin/products/new" className="btn btn--primary btn--sm" data-testid="add-product"><Plus size={16} aria-hidden="true" /> Add product</Link>}>
      <form className="toolbar" role="search" aria-label="Filter products" onSubmit={(e) => { e.preventDefault(); update({ search: searchText.trim() }); }}>
        <div className="field"><label htmlFor="p-search">Search</label>
          <input id="p-search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Name, keyword or SKU" data-testid="filter-search" /></div>
        <div className="field"><label htmlFor="p-cat">Category</label>
          <select id="p-cat" value={query.categoryId ?? ''} onChange={(e) => update({ categoryId: e.target.value })} data-testid="filter-category">
            <option value="">All categories</option>
            {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? '' : ' (inactive)'}</option>)}
          </select></div>
        <div className="field"><label htmlFor="p-status">Status</label>
          <select id="p-status" value={query.status} onChange={(e) => update({ status: e.target.value })} data-testid="filter-status">
            <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select></div>
        <div className="field"><label htmlFor="p-stock">Stock</label>
          <select id="p-stock" value={query.stock} onChange={(e) => update({ stock: e.target.value })} data-testid="filter-stock">
            <option value="all">Any stock</option><option value="low">Low (1 to 5)</option><option value="out">Out of stock</option>
          </select></div>
        <div className="toolbar__actions">
          <button type="submit" className="btn btn--primary btn--sm">Search</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams(new URLSearchParams())} disabled={!hasFilters}>Clear</button>
        </div>
      </form>

      {list.loading && <PageSpinner label="Loading products" />}
      {list.error && <LoadError message={list.error} onRetry={list.reload} />}
      {data && data.items.length === 0 && !list.loading && (
        <EmptyState title="No products found" action={hasFilters ? <button type="button" className="btn btn--primary" onClick={() => setParams(new URLSearchParams())}>Clear filters</button> : undefined}>
          Try different filters, or add a new product.
        </EmptyState>
      )}
      {data && data.items.length > 0 && !list.loading && (
        <>
          <p className="muted" role="status" data-testid="results-summary">{data.totalCount} {data.totalCount === 1 ? 'product' : 'products'}</p>
          <div className="table-wrap">
            <table className="table" data-testid="products-table">
              <caption className="sr-only">Products</caption>
              <thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col" className="num">Price</th><th scope="col">Stock</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((row) => {
                  const p = patches[row.id] ?? row;
                  return (
                    <tr key={p.id} data-testid="product-row">
                      <td>
                        <div className="cell-product">
                          <ProductImage src={p.imageUrl} alt="" className="thumb" />
                          <div><Link to={`/admin/products/${p.id}`} className="cell-product__name">{p.name}</Link><br /><small className="muted">SKU {p.sku}</small></div>
                        </div>
                      </td>
                      <td>{p.categoryName}</td>
                      <td className="num">{formatPrice(p.finalPrice)}{p.discountPercent > 0 && <><br /><small className="muted"><s>{formatPrice(p.price)}</s> -{percent(p.discountPercent)}</small></>}</td>
                      <td><StockCell product={p} onSaved={(u) => setPatches((m) => ({ ...m, [u.id]: u }))} /></td>
                      <td><ActiveBadge active={p.isActive} /></td>
                      <td className="actions">
                        <Link to={`/admin/products/${p.id}`} className="btn btn--outline btn--xs" aria-label={`Edit ${p.name}`}><Pencil size={14} aria-hidden="true" /> Edit</Link>
                        <button type="button" className={`btn btn--xs ${p.isActive ? 'btn--danger-outline' : 'btn--outline'}`} onClick={() => setToggling(p)}
                          aria-label={`${p.isActive ? 'Deactivate' : 'Activate'} ${p.name}`} data-testid="toggle-status"><Power size={14} aria-hidden="true" /> {p.isActive ? 'Deactivate' : 'Activate'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(n) => update({ page: n === 1 ? undefined : String(n) }, false)} />
        </>
      )}

      <ConfirmDialog open={!!toggling} busy={busy} danger={!!toggling?.isActive}
        title={toggling?.isActive ? 'Deactivate this product?' : 'Activate this product?'}
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        message={toggling?.isActive
          ? <><strong>{toggling.name}</strong> will be hidden from shoppers and can no longer be bought. Existing orders are not affected.</>
          : <><strong>{toggling?.name}</strong> will appear in the shop again.</>}
        onCancel={() => setToggling(null)} onConfirm={toggle} />
    </AdminPage>
  );
}
