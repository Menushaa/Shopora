import { Link } from 'react-router-dom';
import type { Product } from '../api/types';
import ProductCard from './ProductCard';
import { LoadError, ProductSkeletons } from './Feedback';

interface Props {
  title: string;
  subtitle?: string;
  products: Product[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  viewAllTo?: string;
  testId: string;
}

/** A titled row of product cards (featured, new arrivals, offers). */
export default function ProductSection({ title, subtitle, products, loading, error, onRetry, viewAllTo, testId }: Props) {
  return (
    <section className="section" aria-labelledby={`${testId}-title`} data-testid={testId}>
      <div className="section__head">
        <div>
          <h2 id={`${testId}-title`}>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {viewAllTo && <Link to={viewAllTo} className="link-strong">See all</Link>}
      </div>
      {loading && <ProductSkeletons count={4} />}
      {error && <LoadError message={error} onRetry={onRetry} />}
      {products && !loading && (
        <div className="product-grid">
          {products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
