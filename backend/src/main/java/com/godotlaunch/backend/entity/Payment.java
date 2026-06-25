package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.PaymentMethod;
import com.godotlaunch.backend.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.sql.Types;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "payment_method", nullable = false, columnDefinition = "payment_method_enum")
    private PaymentMethod paymentMethod = PaymentMethod.MANUAL_BANK_TRANSFER;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "payment_status", nullable = false, columnDefinition = "payment_status_enum")
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @JdbcTypeCode(Types.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "USD";

    @Column(name = "receipt_url", columnDefinition = "TEXT")
    private String receiptUrl;

    @Column(name = "payer_name", length = 200)
    private String payerName;

    @Column(name = "payer_bank", length = 200)
    private String payerBank;

    @Column(name = "transfer_reference", length = 120)
    private String transferReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
