import React, { useContext } from 'react';
import { X, Heart, Trash2 } from 'lucide-react';
import { WishlistContext } from '../context/WishlistContext';
import { Link } from 'react-router-dom';

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function WishlistDropdown() {
  const {
    wishlistItems,
    isWishlistOpen,
    setIsWishlistOpen,
    removeFromWishlist,
    clearWishlist,
  } = useContext(WishlistContext);

  if (!isWishlistOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={() => setIsWishlistOpen(false)}
      />

      {/* Dropdown */}
      <div className="fixed right-0 top-20 md:right-6 md:top-20 w-full md:w-96 max-h-[600px] bg-surface-container border border-white/10 shadow-[0_0_25px_rgba(0,242,255,0.1)] z-50 flex flex-col rounded-lg md:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-secondary" fill="currentColor" />
            <h2 className="font-display-sm text-headline-sm uppercase tracking-widest text-secondary">
              Wishlist
            </h2>
          </div>
          <button
            onClick={() => setIsWishlistOpen(false)}
            className="text-on-surface-variant hover:text-surface-tint transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Heart className="w-12 h-12 text-on-surface-variant/30 mb-2" />
              <p className="text-on-surface-variant/70 font-label-md">
                Your wishlist is empty
              </p>
              <p className="text-on-surface-variant/50 font-label-sm text-xs mt-1">
                Add games you love to keep track of them
              </p>
            </div>
          ) : (
            wishlistItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 bg-surface-container-low rounded-lg border border-white/5 hover:border-secondary/30 transition-all group"
              >
                {/* Product Image */}
                {item.image && (
                  <Link
                    to={`/product/${item.id}`}
                    className="w-16 h-16 rounded bg-surface-container overflow-hidden flex-shrink-0 hover:scale-110 transition-transform duration-300"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                )}

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <Link
                      to={`/product/${item.id}`}
                      className="font-label-md text-label-md text-on-surface font-medium hover:text-secondary transition-colors truncate block"
                    >
                      {item.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-label-sm text-on-surface-variant/70">
                        {item.type === 'FREE' ? 'FREE' : `$${item.price?.toFixed(2)}`}
                      </p>
                    </div>
                    <p className="text-label-xs text-on-surface-variant/50 mt-1">
                      Added {formatDate(item.addedAt)}
                    </p>
                  </div>
                </div>

                {/* Remove Button */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWishlist(item.id);
                    }}
                    className="p-2 hover:bg-secondary/10 rounded transition-colors text-secondary/60 hover:text-secondary"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {wishlistItems.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3 flex gap-2 bg-surface-container-lowest">
            <button
              onClick={() => clearWishlist()}
              className="flex-1 px-3 py-2 border border-error/30 text-error rounded font-label-sm text-label-sm hover:bg-error/10 transition-colors text-xs"
            >
              Clear wishlist
            </button>
          </div>
        )}
      </div>
    </>
  );
}
