package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.SourceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SourceSnapshotRepository extends JpaRepository<SourceSnapshot, UUID> {
    List<SourceSnapshot> findByGameIdOrderByCreatedAtDesc(UUID gameId);
    List<SourceSnapshot> findByMarketplaceItemIdOrderByCreatedAtDesc(UUID itemId);

    // Tra cứu khi tranh chấp: ai từng submit cùng bundle hash
    List<SourceSnapshot> findByBundleHash(String bundleHash);
}
