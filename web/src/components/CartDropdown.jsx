import React, { useContext } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { CartContext } from "../context/CartContext";

export default function CartDropdown() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    cartTotal,
    clearCart,
  } = useContext(CartContext);

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Dropdown */}
      <div className="fixed right-0 top-20 md:right-6 md:top-20 w-full md:w-96 max-h-[600px] bg-surface-container border border-white/10 shadow-[0_0_25px_rgba(0,242,255,0.1)] z-50 flex flex-col rounded-lg md:rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-surface-tint" />
            <h2 className="font-display-sm text-headline-sm uppercase tracking-widest text-surface-tint">
              Shopping Cart
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="text-on-surface-variant hover:text-surface-tint transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <ShoppingBag className="w-12 h-12 text-on-surface-variant/30 mb-2" />
              <p className="text-on-surface-variant/70 font-label-md">
                Your cart is empty
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 bg-surface-container-low rounded-lg border border-white/5 hover:border-white/10 transition-all group"
              >
                {/* Product Image */}
                {item.image && (
                  <div className="w-16 h-16 rounded bg-surface-container overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface font-medium truncate">
                      {item.name}
                    </h3>
                    <p className="text-label-sm text-on-surface-variant/70">
                      ${item.price?.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-surface-container rounded transition-colors text-on-surface-variant hover:text-surface-tint"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-label-sm text-on-surface text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-surface-container rounded transition-colors text-on-surface-variant hover:text-surface-tint"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-auto p-1 hover:bg-error/10 rounded transition-colors text-error/60 hover:text-error"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-white/10 px-4 py-4 flex flex-col gap-4 bg-surface-container-lowest">
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="font-label-md text-on-surface-variant">
                Total:
              </span>
              <span className="font-display-sm text-headline-sm text-surface-tint">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => clearCart()}
                className="flex-1 px-3 py-2 border border-outline-variant/50 text-on-surface-variant font-label-sm rounded hover:bg-surface-container transition-colors text-xs"
              >
                Clear
              </button>
              <button className="flex-1 px-3 py-2 bg-primary-container text-surface-container-lowest font-label-sm rounded hover:bg-primary-fixed transition-all shadow-[0_0_12px_rgba(0,242,255,0.2)] text-xs font-semibold">
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
