package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.AiReviewReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiReviewReportRepository extends JpaRepository<AiReviewReport, UUID> {

    /** Report mới nhất của 1 game (admin xem khi review). */
    Optional<AiReviewReport> findFirstByGameIdOrderByCreatedAtDesc(UUID gameId);

    /** Report mới nhất của 1 marketplace item. */
    Optional<AiReviewReport> findFirstByAssetIdOrderByCreatedAtDesc(UUID itemId);

    /** Report mới nhất phân tích đúng snapshot, không lẫn lần re-submit khác. */
    Optional<AiReviewReport> findFirstBySourceSnapshotIdOrderByCreatedAtDesc(UUID sourceSnapshotId);

    /** Tất cả report của 1 game (lịch sử re-submit). */
    List<AiReviewReport> findByGameIdOrderByCreatedAtDesc(UUID gameId);

    /** Tất cả report của 1 marketplace item. */
    List<AiReviewReport> findByAssetIdOrderByCreatedAtDesc(UUID itemId);
}
