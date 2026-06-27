package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.WithdrawalStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalResponse {
    private UUID id;
    private UUID developerId;
    private String developerEmail;
    private String developerFullName;
    private UUID walletId;
    private BigDecimal amount;
    private String currency;
    private String bankName;
    private String bankAccount;
    private String accountHolder;
    private String transferReference;
    private WithdrawalStatus status;
    private UUID processedById;
    private String processedByFullName;
    private Instant processedAt;
    private String remark;
    private Instant createdAt;
    private Instant updatedAt;
}
