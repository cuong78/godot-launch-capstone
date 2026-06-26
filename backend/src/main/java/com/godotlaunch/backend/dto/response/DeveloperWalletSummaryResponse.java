package com.godotlaunch.backend.dto.response;

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
public class DeveloperWalletSummaryResponse {
    private UUID walletId;
    private UUID developerId;
    private String developerEmail;
    private String developerFullName;
    private String currency;
    private BigDecimal walletBalance;
    private BigDecimal availableBalance;
    private BigDecimal pendingBalance;
    private BigDecimal totalRevenue;
    private Instant updatedAt;
}
