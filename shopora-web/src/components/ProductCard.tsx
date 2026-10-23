import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '../api/types';
import { useShop } from '../context/ShopContext';
import { percent } from '../lib/format';
import ProductImage from './ProductImage';
import { Price, StockNote } from './Price';

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addToCart, toggleWishlist, isInWishlist } = useShop();
  const saved = isInWishlist(product.id);
  const url = `/products/${product.id}`;

  return (
    <article className="product-card" data-testid="product-card" data-product-id={product.id}>
      <div className="product-card__media">
        <Link to={url} tabIndex={-1} aria-hidden="true">
          <ProductImage src={product.imageUrl} alt="" priority={priority} />
        </Link>
        {product.discountPercent > 0 && (
          <span className="badge badge--sale" data-testid="discount-badge">-{percent(product.discountPercent)}</span>
        )}
        <button type="button" className={`icon-btn product-card__wish${saved ? ' is-saved' : ''}`}
          aria-pressed={saved} data-testid="wishlist-toggle"
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          onClick={() => toggleWishlist(product.id)}>
          <Heart size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>
      <div className="product-card__body">
        <p className="product-card__cat">{product.categoryName}</p>
        <h3 className="product-card__name"><Link to={url}>{product.name}</Link></h3>
        <StockNote product={product} />
        <Price product={product} />
        <div className="product-card__actions">
          <Link to={url} className="btn btn--outline btn--sm" aria-label={`View details for ${product.name}`}>View details</Link>
          <button type="button" className="btn btn--primary btn--sm btn--square" disabled={!product.inStock}
            data-testid="add-to-cart" aria-label={product.inStock ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
            onClick={() => addToCart(product.id, 1)}>
            <ShoppingBag size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
