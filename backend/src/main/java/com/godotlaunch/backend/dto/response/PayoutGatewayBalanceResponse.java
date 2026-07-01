package com.godotlaunch.backend.dto.response;

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
