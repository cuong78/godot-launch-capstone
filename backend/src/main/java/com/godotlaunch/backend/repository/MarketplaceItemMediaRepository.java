package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.MarketplaceItemMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MarketplaceItemMediaRepository extends JpaRepository<MarketplaceItemMedia, UUID> {
    List<MarketplaceItemMedia> findByMarketplaceItemId(UUID itemId);
    void deleteByMarketplaceItemId(UUID itemId);
    void deleteByMarketplaceItemIdAndMediaType(UUID itemId, String mediaType);
    void deleteByMarketplaceItemIdAndMediaUrl(UUID itemId, String mediaUrl);
}
