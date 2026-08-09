package com.godotlaunch.backend.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Withdrawal detail with the current wallet source breakdown")
public class WithdrawalDetailResponse extends WithdrawalResponse {
    @Schema(description = "Total funds currently held in the wallet")
    private BigDecimal walletBalance;

    @Schema(description = "Remaining sales revenue before pending withdrawals are reserved")
    private BigDecimal withdrawableBalance;

    @Schema(description = "Purchase-only funds that cannot be withdrawn")
    private BigDecimal restrictedBalance;

    @Schema(description = "Amount available for a new withdrawal request")
    private BigDecimal availableBalance;

    @Schema(description = "Amount reserved by pending, approved, or processing withdrawals")
    private BigDecimal pendingBalance;

    @Schema(description = "Lifetime sales revenue statistic; not a withdrawal limit")
    private BigDecimal totalRevenue;
    private String qrPayload;
    private String standardQrImageUrl;
    private String preferredQrImageUrl;
}
