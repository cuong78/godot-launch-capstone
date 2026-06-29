package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.MarketplaceItem;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface MarketplaceItemRepository extends JpaRepository<MarketplaceItem, UUID> {
    List<MarketplaceItem> findBySellerId(UUID sellerId);
    List<MarketplaceItem> findByStatus(ItemStatus status);

    @Query("SELECT m FROM MarketplaceItem m WHERE m.fileUrl IS NOT NULL AND m.fileUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.fileUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<MarketplaceItem> searchMarketplaceZips(@Param("search") String search, Pageable pageable);

    @Query("SELECT m FROM MarketplaceItem m WHERE m.thumbnailUrl IS NOT NULL AND m.thumbnailUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.thumbnailUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<MarketplaceItem> searchMarketplaceThumbnails(@Param("search") String search, Pageable pageable);
}
