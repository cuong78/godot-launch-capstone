package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findByUserIdOrderByAddedAtDesc(UUID userId);
    Optional<CartItem> findByUserIdAndAssetId(UUID userId, UUID assetId);
    Optional<CartItem> findByUserIdAndGameId(UUID userId, UUID gameId);
}
