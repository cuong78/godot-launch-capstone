package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Asset;
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
public interface AssetRepository extends JpaRepository<Asset, UUID> {
    List<Asset> findBySellerId(UUID sellerId);
    List<Asset> findByStatus(ItemStatus status);

    @Query("SELECT a FROM Asset a WHERE a.fileUrl IS NOT NULL AND a.fileUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.fileUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Asset> searchAssetZips(@Param("search") String search, Pageable pageable);

    @Query("SELECT a FROM Asset a WHERE a.thumbnailUrl IS NOT NULL AND a.thumbnailUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.thumbnailUrl) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Asset> searchAssetThumbnails(@Param("search") String search, Pageable pageable);
}
