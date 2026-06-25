package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    boolean existsByBuyerIdAndMarketplaceItemId(UUID buyerId, UUID marketplaceItemId);
}
