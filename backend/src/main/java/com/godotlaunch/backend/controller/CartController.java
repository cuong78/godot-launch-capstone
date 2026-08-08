package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.request.AddCartItemRequest;
import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.CartItemResponse;
import com.godotlaunch.backend.service.CartItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Tag(name = "Cart API", description = "Endpoints for managing the user shopping cart")
public class CartController {

    private final CartItemService cartItemService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get cart items", description = "Retrieves all items in the logged-in user's cart.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<List<CartItemResponse>>> getCart(Principal principal) {
        List<CartItemResponse> cart = cartItemService.getCart(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(cart, "Cart retrieved successfully."));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add item to cart", description = "Adds a marketplace asset or game source code to the cart.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CartItemResponse>> addToCart(@Valid @RequestBody AddCartItemRequest request, Principal principal) {
        CartItemResponse response = cartItemService.addToCart(request, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(response, "Item added to cart successfully."));
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove item from cart", description = "Removes a marketplace asset or game source code from the cart by product ID.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(@PathVariable UUID itemId, Principal principal) {
        cartItemService.removeFromCart(itemId, principal.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Item removed from cart successfully."));
    }

    @DeleteMapping("/clear")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Clear cart", description = "Removes all items from the logged-in user's cart.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> clearCart(Principal principal) {
        cartItemService.clearCart(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Cart cleared successfully."));
    }
}
