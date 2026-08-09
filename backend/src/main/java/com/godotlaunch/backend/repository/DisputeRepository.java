package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Dispute;
import com.godotlaunch.backend.entity.enums.DisputeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Dispute d WHERE d.id = :id")
    Optional<Dispute> findByIdWithLock(@Param("id") UUID id);

    List<Dispute> findByStatusOrderByCreatedAtDesc(String status);
    List<Dispute> findByReporterIdOrderByCreatedAtDesc(UUID reporterId);
    List<Dispute> findByReportedSellerIdOrderByCreatedAtDesc(UUID sellerId);
    long countByReporterIdAndStatus(UUID reporterId, String status);
    List<Dispute> findAllByOrderByCreatedAtDesc();
    boolean existsByReportedSellerIdAndStatus(UUID reportedSellerId, DisputeStatus status);
    List<Dispute> findByStatusAndRefundConfirmedAtIsNullAndRefundDeadlineBefore(
            DisputeStatus status, Instant cutoff);
}
