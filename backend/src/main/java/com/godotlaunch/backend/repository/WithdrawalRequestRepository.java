package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, UUID> {
    List<WithdrawalRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<WithdrawalRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status);
    List<WithdrawalRequest> findAllByOrderByCreatedAtDesc();
    List<WithdrawalRequest> findByStatusAndCreatedAtBefore(WithdrawalStatus status, Instant cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WithdrawalRequest w WHERE w.id = :id")
    Optional<WithdrawalRequest> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT COALESCE(SUM(w.amount), 0) FROM WithdrawalRequest w WHERE w.user.id = :userId AND w.status IN :statuses")
    java.math.BigDecimal sumAmountByUserIdAndStatusIn(@Param("userId") UUID userId,
                                                      @Param("statuses") Set<WithdrawalStatus> statuses);
}
