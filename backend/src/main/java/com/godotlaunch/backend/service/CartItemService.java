package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.request.AddCartItemRequest;
import com.godotlaunch.backend.dto.response.CartItemResponse;

import java.util.List;
import java.util.UUID;

public interface CartItemService {
    List<CartItemResponse> getCart(String userEmail);
    CartItemResponse addToCart(AddCartItemRequest request, String userEmail);
    void removeFromCart(UUID itemId, String userEmail);
    void clearCart(String userEmail);
}
