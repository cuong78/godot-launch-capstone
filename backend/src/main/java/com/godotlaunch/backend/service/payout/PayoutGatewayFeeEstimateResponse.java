package com.godotlaunch.backend.service.payout;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PayoutGatewayFeeEstimateResponse {
    private final BigDecimal amount;
    private final String currency;
    private final BigDecimal fee;
    private final BigDecimal netAmount;
}
