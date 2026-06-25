package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalRequestResponse {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String userFullName;
    private UUID walletId;
    private BigDecimal amount;
    private String currency;
    private String bankName;
    private String bankAccount;
    private String accountHolder;
    private WithdrawalStatus status;
    private UUID reviewedById;
    private String reviewedByFullName;
    private Instant reviewedAt;
    private String rejectReason;
    private UUID transactionId;
    private Instant createdAt;
    private Instant updatedAt;
}
