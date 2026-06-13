package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MarketplaceItemRepository extends JpaRepository<MarketplaceItem, UUID> {
    List<MarketplaceItem> findBySellerId(UUID sellerId);
    List<MarketplaceItem> findByStatus(ItemStatus status);
}
