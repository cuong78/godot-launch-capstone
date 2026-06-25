package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.entity.Payment;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByOrderId(UUID orderId);
    List<Payment> findByPaymentStatusOrderByCreatedAtAsc(PaymentStatus paymentStatus);
}
