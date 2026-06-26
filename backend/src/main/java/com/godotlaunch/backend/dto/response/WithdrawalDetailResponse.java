package com.godotlaunch.backend.dto.response;

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
public class WithdrawalDetailResponse extends WithdrawalResponse {
    private BigDecimal walletBalance;
    private BigDecimal availableBalance;
    private BigDecimal pendingBalance;
    private BigDecimal totalRevenue;
    private String qrPayload;
    private String standardQrImageUrl;
    private String preferredQrImageUrl;
}
