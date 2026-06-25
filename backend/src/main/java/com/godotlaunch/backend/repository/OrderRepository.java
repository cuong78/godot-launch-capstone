package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByBuyerIdAndMarketplaceItemId(UUID buyerId, UUID marketplaceItemId);
}
