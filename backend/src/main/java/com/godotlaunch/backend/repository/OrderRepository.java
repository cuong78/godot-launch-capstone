package com.godotlaunch.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    boolean existsByBuyerIdAndMarketplaceItemId(UUID buyerId, UUID marketplaceItemId);

    Optional<Order> findByBuyerIdAndMarketplaceItemId(UUID buyerId, UUID marketplaceItemId);
}
