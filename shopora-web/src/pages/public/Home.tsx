import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Dumbbell, Home as HomeIcon, PackageCheck, PackageSearch, Search, Shirt, ShieldCheck, Smartphone, Sparkles, Tag } from 'lucide-react';
import { catalogApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { formatPrice } from '../../lib/format';
import ProductSection from '../../components/ProductSection';
import ProductImage from '../../components/ProductImage';
import { LogoMark } from '../../components/Logo';

export function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('electronic')) return Smartphone;
  if (n.includes('fashion')) return Shirt;
  if (n.includes('home') || n.includes('kitchen')) return HomeIcon;
  if (n.includes('beauty')) return Sparkles;
  if (n.includes('book') || n.includes('stationery')) return BookOpen;
  if (n.includes('sport')) return Dumbbell;
  return Tag;
}

export default function Home() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const featured = useAsync(() => catalogApi.featured(), []);
  const arrivals = useAsync(() => catalogApi.newArrivals(), []);
  const offers = useAsync(() => catalogApi.offers(), []);
  const categories = useAsync(() => catalogApi.categories(), []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const heroProducts = (featured.data ?? []).slice(0, 3);

  return (
    <>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero__panel">
          <div className="hero__text">
            <h1 id="hero-title">Find it. Save it. Have it delivered.</h1>
            <p className="hero__lead">Browse a growing range of electronics, fashion, home essentials and more, with clear prices and live stock on every product.</p>
            <form className="hero__search" role="search" onSubmit={search}>
              <Search size={20} aria-hidden="true" />
              <label htmlFor="hero-search" className="sr-only">Search products</label>
              <input id="hero-search" type="search" placeholder="What are you looking for?" value={term}
                onChange={(e) => setTerm(e.target.value)} data-testid="hero-search-input" autoComplete="off" />
              <button type="submit" className="btn btn--primary" data-testid="hero-search-submit">Search</button>
            </form>
            <div className="hero__cta">
              <Link to="/products" className="btn btn--light">Shop all products</Link>
              <Link to="/categories" className="btn btn--outline">Browse categories</Link>
            </div>
          </div>

          <div className="hero__stage" aria-label="Featured products">
            {heroProducts.length > 0 ? heroProducts.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="hero__item" data-testid="hero-product">
                <ProductImage src={p.imageUrl} alt="" priority />
                <strong>{p.name}</strong>
                <span>{formatPrice(p.finalPrice)}</span>
              </Link>
            )) : (
              <div className="hero__bag"><LogoMark size={220} /></div>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section" aria-labelledby="popular-title" data-testid="popular-categories">
          <div className="section__head">
            <div><h2 id="popular-title">Popular categories</h2></div>
            <Link to="/categories" className="link-strong">All categories</Link>
          </div>
          {categories.error && <p className="muted">Categories are unavailable right now.</p>}
          <div className="chips">
            {(categories.data ?? []).map((c) => {
              const Icon = categoryIcon(c.name);
              return (
                <Link key={c.id} to={`/products?categoryId=${c.id}`} className="chip" data-testid="category-chip">
                  <Icon size={18} aria-hidden="true" /> {c.name} <small>{c.productCount}</small>
                </Link>
              );
            })}
          </div>
        </section>

        <ProductSection testId="featured" title="Featured products" subtitle="Hand-picked favourites from every category."
          loading={featured.loading} error={featured.error} products={featured.data} onRetry={featured.reload} viewAllTo="/products" />
        <ProductSection testId="new-arrivals" title="New arrivals" subtitle="The latest additions to the shelves."
          loading={arrivals.loading} error={arrivals.error} products={arrivals.data} onRetry={arrivals.reload} viewAllTo="/products?sort=newest" />
        <ProductSection testId="offers" title="Special offers" subtitle="Discounted products, biggest savings first."
          loading={offers.loading} error={offers.error} products={offers.data} onRetry={offers.reload} />

        <section className="reasons" aria-label="Why shop with Shopora">
          <div className="reason">
            <PackageSearch size={26} aria-hidden="true" />
            <div><h3>Live availability</h3><p>Every product shows what is in stock right now, so there are no surprises at checkout.</p></div>
          </div>
          <div className="reason">
            <PackageCheck size={26} aria-hidden="true" />
            <div><h3>Follow every order</h3><p>Watch your order move from Pending to Delivered, and cancel while it is still early.</p></div>
          </div>
          <div className="reason">
            <ShieldCheck size={26} aria-hidden="true" />
            <div><h3>Protected accounts</h3><p>Passwords are never stored as plain text, and your orders stay private to you.</p></div>
          </div>
        </section>
      </div>
    </>
  );
}
