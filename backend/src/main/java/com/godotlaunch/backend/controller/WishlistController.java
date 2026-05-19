package com.godotlaunch.backend.controller;

import com.godotlaunch.backend.dto.response.ApiResponse;
import com.godotlaunch.backend.dto.response.GameResponse;
import com.godotlaunch.backend.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wishlist")
@RequiredArgsConstructor
@Tag(name = "Wishlist Management API", description = "Endpoints for players to manage their game wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    @PostMapping("/{gameId}")
    @Operation(summary = "Add a game to wishlist", description = "Adds a specific game to the authenticated user's wishlist.")
    public ResponseEntity<ApiResponse<Void>> addGameToWishlist(
            @PathVariable UUID gameId,
            Principal principal) {
        wishlistService.addGameToWishlist(principal.getName(), gameId);
        return ResponseEntity.ok(ApiResponse.success(null, "Game added to wishlist successfully."));
    }

    @DeleteMapping("/{gameId}")
    @Operation(summary = "Remove a game from wishlist", description = "Removes a specific game from the authenticated user's wishlist.")
    public ResponseEntity<ApiResponse<Void>> removeGameFromWishlist(
            @PathVariable UUID gameId,
            Principal principal) {
        wishlistService.removeGameFromWishlist(principal.getName(), gameId);
        return ResponseEntity.ok(ApiResponse.success(null, "Game removed from wishlist successfully."));
    }

    @GetMapping
    @Operation(summary = "Get user's wishlist", description = "Retrieves all games in the authenticated user's wishlist.")
    public ResponseEntity<ApiResponse<List<GameResponse>>> getWishlist(Principal principal) {
        List<GameResponse> wishlist = wishlistService.getWishlist(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(wishlist, "Wishlist retrieved successfully."));
    }

    @GetMapping("/{gameId}/status")
    @Operation(summary = "Check if game is wishlisted", description = "Checks whether a specific game is in the authenticated user's wishlist.")
    public ResponseEntity<ApiResponse<Boolean>> isGameWishlisted(
            @PathVariable UUID gameId,
            Principal principal) {
        boolean isWishlisted = wishlistService.isGameWishlisted(principal.getName(), gameId);
        return ResponseEntity.ok(ApiResponse.success(isWishlisted, "Wishlist status retrieved successfully."));
    }
}
