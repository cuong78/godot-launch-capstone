package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.SourceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

@Repository
public interface SourceSnapshotRepository extends JpaRepository<SourceSnapshot, UUID> {
    List<SourceSnapshot> findByGameIdOrderByCreatedAtDesc(UUID gameId);
    List<SourceSnapshot> findByMarketplaceItemIdOrderByCreatedAtDesc(UUID itemId);

    // Tra cứu khi tranh chấp: ai từng submit cùng bundle hash
    List<SourceSnapshot> findByBundleHash(String bundleHash);

    @Query("SELECT s FROM SourceSnapshot s WHERE s.bundleUrl IS NOT NULL AND s.bundleUrl <> '' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "LOWER(s.bundleUrl) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.game.title) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<SourceSnapshot> searchSnapshots(@Param("search") String search, Pageable pageable);
}
