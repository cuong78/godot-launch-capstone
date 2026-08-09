package com.godotlaunch.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Wallet balance breakdown with withdrawal source restrictions")
public class DeveloperWalletSummaryResponse {
    private UUID walletId;
    private UUID developerId;
    private String developerEmail;
    private String developerFullName;
    private String currency;
    @Schema(description = "Total funds currently held in the wallet", example = "250000.00")
    private BigDecimal walletBalance;

    @Schema(description = "Remaining sales revenue before pending withdrawals are reserved", example = "150000.00")
    private BigDecimal withdrawableBalance;

    @Schema(description = "Purchase-only funds such as top-ups and incoming dispute refunds", example = "100000.00")
    private BigDecimal restrictedBalance;

    @Schema(description = "Sales revenue available for a new withdrawal request after pending holds", example = "50000.00")
    private BigDecimal availableBalance;

    @Schema(description = "Amount reserved by pending, approved, or processing withdrawals", example = "100000.00")
    private BigDecimal pendingBalance;

    @Schema(description = "Lifetime sales revenue statistic; never use this value to validate a withdrawal", example = "500000.00")
    private BigDecimal totalRevenue;
    private Instant updatedAt;
}
