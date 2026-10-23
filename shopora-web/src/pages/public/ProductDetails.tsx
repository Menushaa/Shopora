import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag } from 'lucide-react';
import { catalogApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { rememberProduct } from '../../lib/recentlyViewed';
import { percent } from '../../lib/format';
import { useShop } from '../../context/ShopContext';
import ProductImage from '../../components/ProductImage';
import { Price, StockNote } from '../../components/Price';
import { LoadError, PageSpinner } from '../../components/Feedback';
import NotFound from './NotFound';

export default function ProductDetails() {
  const { id } = useParams();
  const productId = Number(id);
  const valid = Number.isInteger(productId) && productId > 0;
  const { addToCart, toggleWishlist, isInWishlist } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const { data: product, loading, error, reload } = useAsync(
    () => (valid ? catalogApi.get(productId) : Promise.reject(new ApiError(404, 'NOT_FOUND', 'Product not found.'))),
    [productId],
  );
  useDocumentTitle(product?.name ?? 'Product');

  useEffect(() => { setQuantity(1); }, [productId]);
  useEffect(() => { if (product) rememberProduct(product.id); }, [product]);

  if (loading) return <PageSpinner label="Loading product" />;
  if (error || !product) {
    // A 404 means the product does not exist or is no longer for sale.
    return error?.toLowerCase().includes('not found') || !valid
      ? <NotFound title="We could not find that product" message="It may have been removed or is no longer for sale." backTo="/products" backLabel="Browse products" />
      : <div className="container page"><LoadError message={error ?? 'Unknown error'} onRetry={reload} /></div>;
  }

  const saved = isInWishlist(product.id);
  const max = Math.max(product.stock, 1);
  const setQty = (n: number) => setQuantity(Math.min(Math.max(Number.isFinite(n) ? Math.floor(n) : 1, 1), max));

  const add = async () => {
    setAdding(true);
    await addToCart(product.id, quantity);
    setAdding(false);
  };

  return (
    <div className="container page">
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/products">Products</Link></li>
          <li><Link to={`/products?categoryId=${product.categoryId}`}>{product.categoryName}</Link></li>
        </ol>
      </nav>

      <div className="detail" data-testid="product-detail">
        <div className="detail__media">
          <ProductImage src={product.imageUrl} alt={product.name} priority />
          {product.discountPercent > 0 && <span className="badge badge--sale" data-testid="discount-badge">-{percent(product.discountPercent)}</span>}
        </div>

        <div>
          <p className="detail__cat"><Link to={`/products?categoryId=${product.categoryId}`}>{product.categoryName}</Link></p>
          <h1 data-testid="product-name">{product.name}</h1>
          <p className="detail__sku">SKU {product.sku}</p>
          <Price product={product} large />
          <StockNote product={product} />
          <p className="detail__desc" data-testid="product-description">{product.description ?? 'No description available.'}</p>

          <div className="buy-box">
            {product.inStock && (
              <div>
                <span className="buy-box__qty-label" id="qty-label">Quantity</span>
                <div className="qty" role="group" aria-labelledby="qty-label">
                  <button type="button" onClick={() => setQty(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={18} aria-hidden="true" /></button>
                  <input type="number" inputMode="numeric" min={1} max={max} value={quantity} aria-label="Quantity"
                    onChange={(e) => setQty(Number(e.target.value))} data-testid="quantity-input" />
                  <button type="button" onClick={() => setQty(quantity + 1)} disabled={quantity >= max} aria-label="Increase quantity"><Plus size={18} aria-hidden="true" /></button>
                </div>
              </div>
            )}
            <div className="buy-box__row">
              <button type="button" className="btn btn--primary btn--lg" onClick={add} disabled={!product.inStock || adding} data-testid="add-to-cart">
                {adding ? <span className="spinner" aria-hidden="true" /> : <ShoppingBag size={20} aria-hidden="true" />}
                {product.inStock ? 'Add to cart' : 'Out of stock'}
              </button>
              <button type="button" className="btn btn--outline btn--lg" aria-pressed={saved} onClick={() => toggleWishlist(product.id)} data-testid="wishlist-toggle">
                <Heart size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
                {saved ? 'Saved to wishlist' : 'Save to wishlist'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 32 }}><Link to="/products"><ArrowLeft size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> Back to products</Link></p>
    </div>
  );
}
