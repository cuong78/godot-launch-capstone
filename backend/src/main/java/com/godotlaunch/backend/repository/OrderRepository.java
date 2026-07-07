package com.godotlaunch.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    boolean existsByBuyerIdAndAssetId(UUID buyerId, UUID assetId);
    Optional<Order> findByBuyerIdAndAssetId(UUID buyerId, UUID assetId);

    boolean existsByBuyerIdAndGameId(UUID buyerId, UUID gameId);
    Optional<Order> findByBuyerIdAndGameId(UUID buyerId, UUID gameId);
}
