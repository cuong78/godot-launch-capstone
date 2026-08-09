package com.godotlaunch.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.godotlaunch.backend.entity.WithdrawalRequest;
import com.godotlaunch.backend.entity.enums.WithdrawalStatus;

import jakarta.persistence.LockModeType;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, UUID> {
    List<WithdrawalRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<WithdrawalRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status);
    List<WithdrawalRequest> findAllByOrderByCreatedAtDesc();
    // Fetch join user: WithdrawalAutoPayoutScheduler đọc withdrawal.getUser().getLockedForDispute()
    // NGOÀI transaction (chạy trong scheduled task, không có session) — nếu chỉ lazy-load user thì
    // Hibernate ném LazyInitializationException lúc truy cập field. Nạp sẵn user cùng lúc để tránh.
    @Query("SELECT w FROM WithdrawalRequest w JOIN FETCH w.user WHERE w.status = :status AND w.createdAt < :cutoff")
    List<WithdrawalRequest> findByStatusAndCreatedAtBeforeWithUser(@Param("status") WithdrawalStatus status,
                                                                     @Param("cutoff") Instant cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WithdrawalRequest w WHERE w.id = :id")
    Optional<WithdrawalRequest> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT COALESCE(SUM(w.amount), 0) FROM WithdrawalRequest w WHERE w.user.id = :userId AND w.status IN :statuses")
    java.math.BigDecimal sumAmountByUserIdAndStatusIn(@Param("userId") UUID userId,
                                                      @Param("statuses") Set<WithdrawalStatus> statuses);
}
