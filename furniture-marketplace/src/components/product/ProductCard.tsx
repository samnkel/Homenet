import { Link } from 'react-router-dom';
import { Heart, Star, Truck } from 'lucide-react';
import type { Product } from '../../types';
import { formatZAR } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/Badge';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({
  product,
  className,
}: ProductCardProps) {
  const { isWishlisted, toggleItem } = useWishlist();
  const { toast } = useToast();
  const wishlisted = isWishlisted(product.id);
  const discount =
    product.salePrice && product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  return (
    <article
      className={cn(
        'product-showroom-card group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-card transition-all duration-300 hover:shadow-elevated',
        className
      )}
    >
      <Link
        to={`/product/${product.id}`}
        className="product-showroom-image relative aspect-[4/3] overflow-hidden bg-cream"
      >
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {discount > 0 && (
          <Badge variant="error" className="absolute left-3 top-3">
            -{discount}%
          </Badge>
        )}
        {product.newArrival && (
          <Badge variant="gold" className="absolute left-3 top-3">
            New
          </Badge>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            void toggleItem(product.id)
              .then(() =>
                toast(
                  wishlisted ? 'Removed from wishlist' : 'Added to wishlist',
                  'success'
                )
              )
              .catch((error: unknown) => {
                console.error('Unable to update wishlist:', error);
                toast(
                  error instanceof Error ? error.message : 'Could not update your wishlist.',
                  'error'
                );
              });
          }}
          className={cn(
            'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-soft transition-colors hover:bg-white',
            wishlisted && 'text-error'
          )}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={cn('h-4 w-4', wishlisted && 'fill-current')} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-muted">{product.businessName}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-charcoal transition-colors group-hover:text-brown">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
            <span className="text-xs font-medium text-charcoal">{product.rating}</span>
          </div>
          <span className="text-xs text-muted">({product.reviewCount})</span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-bold text-charcoal">
            {formatZAR(product.salePrice ?? product.price)}
          </span>
          {product.salePrice && (
            <span className="text-sm text-muted line-through">
              {formatZAR(product.price)}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted">
          <Truck className="h-3.5 w-3.5" />
          <span>{product.deliveryEstimate}</span>
          {product.stock > 0 ? (
            <span className="ml-auto text-success">In stock</span>
          ) : (
            <span className="ml-auto text-error">Out of stock</span>
          )}
        </div>
      </div>
    </article>
  );
}
