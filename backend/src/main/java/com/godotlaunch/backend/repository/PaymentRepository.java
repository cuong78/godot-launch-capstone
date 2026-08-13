package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByPayosOrderCode(Long payosOrderCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.payosOrderCode = :orderCode")
    Optional<Payment> findByPayosOrderCodeForUpdate(@Param("orderCode") Long orderCode);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") UUID id);
    boolean existsByPayosOrderCode(Long payosOrderCode);
    List<Payment> findTop50ByOrderByCreatedAtDesc();
    List<Payment> findByWalletUserIdOrderByCreatedAtDesc(UUID userId);
    List<Payment> findByPaymentStatusOrderByCreatedAtDesc(PaymentStatus paymentStatus);
    Optional<Payment> findByWalletIdAndPaymentReferenceAndPaymentStatus(UUID walletId, String paymentReference, PaymentStatus paymentStatus);

    @Query("SELECT p FROM Payment p WHERE p.paymentReference LIKE 'BUY_ASSET:%' OR p.paymentReference LIKE 'BUY_GAME:%'")
    List<Payment> findAllProductPurchasePayments();
}
