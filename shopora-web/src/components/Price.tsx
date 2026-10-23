import type { Product } from '../api/types';
import { formatPrice, percent } from '../lib/format';

export function Price({ product, large = false }: { product: Pick<Product, 'price' | 'finalPrice' | 'discountPercent'>; large?: boolean }) {
  const onSale = product.discountPercent > 0;
  return (
    <p className={`price${large ? ' price--large' : ''}`} data-testid="price">
      <span className="price__now" data-testid="price-final">{formatPrice(product.finalPrice)}</span>
      {onSale && (
        <>
          <s className="price__was" data-testid="price-original">
            <span className="sr-only">Original price </span>{formatPrice(product.price)}
          </s>
          <span className="sr-only"> ({percent(product.discountPercent)} off)</span>
        </>
      )}
    </p>
  );
}

export function StockNote({ product }: { product: Pick<Product, 'stock' | 'inStock'> }) {
  if (!product.inStock) return <p className="stock stock--out" data-testid="stock-status">Out of stock</p>;
  if (product.stock <= 5) return <p className="stock stock--low" data-testid="stock-status">Only {product.stock} left</p>;
  return <p className="stock stock--in" data-testid="stock-status">In stock</p>;
}
