import React, { createContext, useState, useCallback } from "react";

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([
    {
      id: "void-protocol",
      name: "Void Protocol",
      price: 0,
      type: "FREE",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD9zbZtPP21KviTY1bLBjP_wwbpX7B5D0eDLybU0jcg6gaVIOhEHozug16y-zhl0mQc-6S0AcCMU0cD_vzDLXBMcK5j9CDXspgM3y2S2RvyD2gC96c9beIPyRI_X7KPSixsVRwpvHVAJTfNPegkZOzGApNo6wGNJy9u7UNT3hzH-lwLFSlPuBpgZuFcZoNx8-yoiEnJhSTHMltDqQOO6d-6rBFE2IWHM6vWeh0o7FyW9QAbkwq1wXFQAoNWWB2Chv2kgIJtRfydyKiL",
      addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const addToWishlist = useCallback((game) => {
    setWishlistItems((prevItems) => {
      const exists = prevItems.find((item) => item.id === game.id);
      if (exists) return prevItems;
      return [
        ...prevItems,
        {
          ...game,
          addedAt: new Date(),
        },
      ];
    });
  }, []);

  const removeFromWishlist = useCallback((gameId) => {
    setWishlistItems((prevItems) =>
      prevItems.filter((item) => item.id !== gameId),
    );
  }, []);

  const isInWishlist = useCallback(
    (gameId) => {
      return wishlistItems.some((item) => item.id === gameId);
    },
    [wishlistItems],
  );

  const clearWishlist = useCallback(() => {
    setWishlistItems([]);
  }, []);

  const value = {
    wishlistItems,
    isWishlistOpen,
    setIsWishlistOpen,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    wishlistCount: wishlistItems.length,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
