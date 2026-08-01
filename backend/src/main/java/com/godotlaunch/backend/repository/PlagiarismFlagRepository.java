package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.PlagiarismFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlagiarismFlagRepository extends JpaRepository<PlagiarismFlag, UUID> {
    List<PlagiarismFlag> findBySourceSnapshotIdOrderBySimilarityScoreDesc(UUID sourceSnapshotId);
    Optional<PlagiarismFlag> findByCodeEmbeddingIdAndMatchedCodeEmbeddingId(
            UUID codeEmbeddingId, UUID matchedCodeEmbeddingId);

    @Modifying
    @Query("UPDATE PlagiarismFlag flag SET flag.reviewedByAdmin = true "
            + "WHERE flag.sourceSnapshot.id = :snapshotId AND flag.reviewedByAdmin = false")
    int markReviewedBySnapshotId(@Param("snapshotId") UUID snapshotId);
}
