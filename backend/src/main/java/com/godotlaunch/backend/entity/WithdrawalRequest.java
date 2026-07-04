package com.godotlaunch.backend.entity;

import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.sql.Types;

@Entity
@Table(name = "withdrawal_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", unique = true)
    private Transaction transaction;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @JdbcTypeCode(Types.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "VND";

    @Column(name = "bank_name", nullable = false, length = 200)
    private String bankName;

    @Column(name = "bank_account", nullable = false, length = 100)
    private String bankAccount;

    @Column(name = "account_holder", nullable = false, length = 200)
    private String accountHolder;

    @Column(name = "transfer_reference", length = 120)
    private String transferReference;

    @Column(name = "payos_payout_id", length = 120)
    private String payosPayoutId;

    @Column(name = "payos_reference_id", length = 120)
    private String payosReferenceId;

    @Column(name = "payos_status", length = 50)
    private String payosStatus;

    @Column(name = "payos_created_at", columnDefinition = "TEXT")
    private String payosCreatedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "withdrawal_status_enum")
    private WithdrawalStatus status = WithdrawalStatus.pending;


    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;


    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;
}
