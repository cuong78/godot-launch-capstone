package com.godotlaunch.backend.service.payout;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PayoutGatewayBalanceResponse {
    private final String accountNumber;
    private final String accountName;
    private final String currency;
    private final BigDecimal balance;
    private final String status;
}
