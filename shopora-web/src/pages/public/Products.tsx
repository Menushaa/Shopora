import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { catalogApi } from '../../api/endpoints';
import type { ProductQuery, SortOption } from '../../api/types';
import { useAsync } from '../../lib/useAsync';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { formatPrice } from '../../lib/format';
import ProductCard from '../../components/ProductCard';
import Pagination from '../../components/Pagination';
import { EmptyState, LoadError, ProductSkeletons } from '../../components/Feedback';

const PAGE_SIZE = 12;
const SORTS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const toNumber = (v: string | null): number | undefined => {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** The URL is the single source of truth, so filtered pages can be shared, bookmarked and reloaded. */
function readQuery(params: URLSearchParams): ProductQuery {
  const sort = params.get('sort') as SortOption | null;
  const page = Math.floor(toNumber(params.get('page')) ?? 1);
  return {
    search: params.get('search')?.trim() || undefined,
    categoryId: toNumber(params.get('categoryId')),
    minPrice: toNumber(params.get('minPrice')),
    maxPrice: toNumber(params.get('maxPrice')),
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortOption) : 'newest',
    page: page >= 1 ? page : 1,
    pageSize: PAGE_SIZE,
  };
}

export default function Products() {
  useDocumentTitle('Products');
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => readQuery(params), [params]);

  const [searchText, setSearchText] = useState(query.search ?? '');
  const [minText, setMinText] = useState(query.minPrice?.toString() ?? '');
  const [maxText, setMaxText] = useState(query.maxPrice?.toString() ?? '');
  const [priceError, setPriceError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Keep the form boxes in step with the URL (back button, pills, header search).
  useEffect(() => {
    setSearchText(query.search ?? '');
    setMinText(query.minPrice?.toString() ?? '');
    setMaxText(query.maxPrice?.toString() ?? '');
    setPriceError('');
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useAsync(() => catalogApi.categories(), []);
  const result = useAsync(() => catalogApi.list(query), [params.toString()]);

  const update = (changes: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key); else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    setParams(next);
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    const min = minText.trim() === '' ? undefined : Number(minText);
    const max = maxText.trim() === '' ? undefined : Number(maxText);
    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) || (max !== undefined && (!Number.isFinite(max) || max < 0))) {
      setPriceError('Enter prices as positive numbers.');
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setPriceError('Minimum price cannot be greater than maximum price.');
      return;
    }
    setPriceError('');
    update({ search: searchText.trim(), minPrice: min?.toString(), maxPrice: max?.toString() });
    setShowFilters(false);
  };

  const clearAll = () => setParams(new URLSearchParams());
  const categoryName = categories.data?.find((c) => c.id === query.categoryId)?.name;
  const hasFilters = !!(query.search || query.categoryId || query.minPrice !== undefined || query.maxPrice !== undefined);

  const data = result.data;
  const from = data && data.totalCount > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.totalCount) : 0;

  return (
    <div className="container page">
      <div className="page__head">
        <h1>Products</h1>
        <p>Search, filter and sort to find exactly what you need.</p>
      </div>

      <div className="products-layout">
        <aside aria-label="Filters">
          <button type="button" className="btn btn--outline btn--sm filters__toggle" aria-expanded={showFilters}
            aria-controls="filters-panel" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal size={18} aria-hidden="true" /> {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
          <form id="filters-panel" className={`filters${showFilters ? '' : ' filters--collapsed'}`} onSubmit={applyFilters} noValidate data-testid="filters">
            <h2>Filters</h2>
            <div className="field">
              <label htmlFor="f-search">Search</label>
              <input id="f-search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                placeholder="Name or keyword" data-testid="filter-search" autoComplete="off" />
            </div>

            <fieldset>
              <legend>Category</legend>
              <label className="radio">
                <input type="radio" name="category" checked={!query.categoryId} onChange={() => update({ categoryId: undefined })} data-testid="filter-category-all" />
                All categories
              </label>
              {(categories.data ?? []).map((c) => (
                <label className="radio" key={c.id}>
                  <input type="radio" name="category" checked={query.categoryId === c.id} onChange={() => update({ categoryId: String(c.id) })}
                    data-testid={`filter-category-${c.id}`} />
                  {c.name} <small>{c.productCount}</small>
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend>Price (Rs.)</legend>
              <div className="price-inputs">
                <div className="field">
                  <label htmlFor="f-min" className="sr-only">Minimum price</label>
                  <input id="f-min" inputMode="decimal" placeholder="Min" value={minText} onChange={(e) => setMinText(e.target.value)}
                    aria-invalid={priceError ? true : undefined} aria-describedby={priceError ? 'price-error' : undefined} data-testid="filter-min-price" />
                </div>
                <div className="field">
                  <label htmlFor="f-max" className="sr-only">Maximum price</label>
                  <input id="f-max" inputMode="decimal" placeholder="Max" value={maxText} onChange={(e) => setMaxText(e.target.value)}
                    aria-invalid={priceError ? true : undefined} aria-describedby={priceError ? 'price-error' : undefined} data-testid="filter-max-price" />
                </div>
              </div>
              {priceError && <p id="price-error" className="field__error" role="alert" data-testid="price-error">{priceError}</p>}
            </fieldset>

            <div className="filters__actions">
              <button type="submit" className="btn btn--primary" data-testid="apply-filters">Apply filters</button>
              <button type="button" className="btn btn--ghost" onClick={clearAll} disabled={!hasFilters} data-testid="clear-filters">Clear all</button>
            </div>
          </form>
        </aside>

        <section aria-label="Product results">
          <div className="results-bar">
            <p role="status" aria-live="polite" data-testid="results-summary">
              {result.loading ? 'Loading products...' : data && data.totalCount > 0
                ? `Showing ${from} to ${to} of ${data.totalCount} products`
                : 'No products found'}
            </p>
            <div className="field">
              <label htmlFor="sort">Sort by</label>
              <select id="sort" value={query.sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? undefined : e.target.value })} data-testid="sort-select">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="active-filters" aria-label="Active filters">
              {query.search && <span className="pill">Search: {query.search}<button type="button" aria-label="Remove search filter" onClick={() => update({ search: undefined })}><X size={14} aria-hidden="true" /></button></span>}
              {query.categoryId && <span className="pill">{categoryName ?? 'Category'}<button type="button" aria-label="Remove category filter" onClick={() => update({ categoryId: undefined })}><X size={14} aria-hidden="true" /></button></span>}
              {(query.minPrice !== undefined || query.maxPrice !== undefined) && (
                <span className="pill">
                  {query.minPrice !== undefined ? formatPrice(query.minPrice) : 'Any'} to {query.maxPrice !== undefined ? formatPrice(query.maxPrice) : 'Any'}
                  <button type="button" aria-label="Remove price filter" onClick={() => update({ minPrice: undefined, maxPrice: undefined })}><X size={14} aria-hidden="true" /></button>
                </span>
              )}
            </div>
          )}

          {result.loading && <ProductSkeletons count={6} />}
          {result.error && <LoadError message={result.error} onRetry={result.reload} />}
          {data && !result.loading && data.items.length === 0 && (
            <EmptyState title="No products match your search"
              action={hasFilters ? <button type="button" className="btn btn--primary" onClick={clearAll}>Clear filters</button> : undefined}>
              Try a different keyword, widen the price range, or choose another category.
            </EmptyState>
          )}
          {data && !result.loading && data.items.length > 0 && (
            <>
              <div className="product-grid" data-testid="product-grid">
                {data.items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 3} />)}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages}
                onChange={(p) => { update({ page: p === 1 ? undefined : String(p) }, false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </section>
      </div>
      <p className="muted" style={{ marginTop: 28 }}>Prices are shown after discount. <Link to="/categories">Browse by category</Link></p>
    </div>
  );
}
