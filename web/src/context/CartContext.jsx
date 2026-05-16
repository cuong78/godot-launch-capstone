import React, { createContext, useState, useCallback } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([
    {
      id: "neon-drifter",
      name: "Neon Drifter",
      price: 14.99,
      quantity: 1,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAvOZFrlEJM0KYkM_N5u6MN2XnWA1KigB-8Yp72rT8ICRelTh7CUnfcVWzXFxsBg1nhApw0HtGGniIahNvXSrYWo4_dyh6KSST0RYnDmAJhKaq8jO_0dLbp5Y7c9rr7iKRUT2Z1BH5_hXFSQw_7KKuietx_qmdtHmJsCD0HBzen1b6-EHJ3lyIw7nWsdtjcnfvCHKa0JDSXyVVtW67K4T_y4u7m2-_Yk3vqd_qBBosp8vxL2j7M2sfUrzmVXMw76DpGBZnmgreqdT9O",
    },
    {
      id: "student-quest",
      name: "Student Quest",
      price: 9.99,
      quantity: 2,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBGSTmdKVD8x-sX6SV8dVZvUaJocOtHq_zHG8i35o3FPWY_HLxgkFef_0HfMTJgmchlmYmHHamVleqqsYlT0VrQNhz0jeaoxEc586i7aBpVURplL8p6kmsLl-pzOEVlonfzirjP7l6RrA6ro3jQfbkJ1LyR3Hx6n_CCWoJbxsB9AN_4Gv0kMIFEs3W8-KdbQqWXgdZ4bmcHfE-qrDilzHmXFQCUzOzzFLmvu9YDXzhQkCmEpMo-Mfe58AYT7S1G0puOfNgTstKmODsn",
    },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = useCallback((product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(productId);
      } else {
        setCartItems((prevItems) =>
          prevItems.map((item) =>
            item.id === productId ? { ...item, quantity } : item,
          ),
        );
      }
    },
    [removeFromCart],
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.price || 0) * item.quantity;
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const value = {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
