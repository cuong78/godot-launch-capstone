package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.GameResponse;

import java.util.List;
import java.util.UUID;

public interface WishlistService {
    void addGameToWishlist(String userEmail, UUID gameId);
    void removeGameFromWishlist(String userEmail, UUID gameId);
    List<GameResponse> getWishlist(String userEmail);
    boolean isGameWishlisted(String userEmail, UUID gameId);
}
