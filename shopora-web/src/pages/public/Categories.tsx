import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/endpoints';
import { useAsync } from '../../lib/useAsync';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { EmptyState, LoadError, PageSpinner } from '../../components/Feedback';
import { categoryIcon } from './Home';

export default function Categories() {
  useDocumentTitle('Categories');
  const { data, loading, error, reload } = useAsync(() => catalogApi.categories(), []);

  return (
    <div className="container page">
      <div className="page__head">
        <h1>Categories</h1>
        <p>Pick a category to see everything in it.</p>
      </div>
      {loading && <PageSpinner label="Loading categories" />}
      {error && <LoadError message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No categories yet">Please check back soon.</EmptyState>}
      {data && data.length > 0 && (
        <ul className="cat-grid" data-testid="category-grid">
          {data.map((c) => {
            const Icon = categoryIcon(c.name);
            return (
              <li key={c.id}>
                <Link to={`/products?categoryId=${c.id}`} className="cat-tile" data-testid="category-tile">
                  <span className="cat-tile__icon"><Icon size={26} aria-hidden="true" /></span>
                  <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{c.name}</h2>
                  {c.description && <p>{c.description}</p>}
                  <span className="cat-tile__count">{c.productCount} {c.productCount === 1 ? 'product' : 'products'}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
