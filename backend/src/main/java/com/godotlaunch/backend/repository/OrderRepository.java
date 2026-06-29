package com.godotlaunch.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.Order;
import com.godotlaunch.backend.entity.enums.OrderStatus;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    boolean existsByBuyerIdAndAssetIdAndOrderStatus(UUID buyerId, UUID assetId, OrderStatus orderStatus);

    Optional<Order> findByBuyerIdAndAssetId(UUID buyerId, UUID assetId);
}
