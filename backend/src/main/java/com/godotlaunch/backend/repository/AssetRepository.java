package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Asset;
import com.godotlaunch.backend.entity.enums.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID> {
    boolean existsByTitleIgnoreCaseAndStatusIn(String title, java.util.Collection<com.godotlaunch.backend.entity.enums.ItemStatus> statuses);
    boolean existsByTitleIgnoreCaseAndStatusInAndIdNot(String title, java.util.Collection<com.godotlaunch.backend.entity.enums.ItemStatus> statuses, java.util.UUID id);
    List<Asset> findBySellerId(UUID sellerId);
    List<Asset> findByStatus(ItemStatus status);

    @EntityGraph(attributePaths = {"seller", "category", "tags"})
    @Query("SELECT DISTINCT a FROM Asset a WHERE a.status = :status")
    List<Asset> findStorefrontAssets(@Param("status") ItemStatus status);

    @EntityGraph(attributePaths = {"seller", "category", "tags"})
    @Query("SELECT DISTINCT a FROM Asset a WHERE (:status IS NULL OR a.status = :status) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.category.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Asset> searchAssets(@Param("status") ItemStatus status, @Param("search") String search);

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

    @Query("SELECT a FROM Asset a WHERE :search IS NULL OR :search = '' OR " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Asset> searchAssetsForFileManagement(@Param("search") String search, Pageable pageable);
}
