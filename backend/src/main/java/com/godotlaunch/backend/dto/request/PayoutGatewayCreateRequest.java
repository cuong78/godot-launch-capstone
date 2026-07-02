package com.godotlaunch.backend.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class PayoutGatewayCreateRequest {
    private final UUID withdrawalRequestId;
    private final BigDecimal amount;
    private final String currency;
    private final String bankName;
    private final String bankAccount;
    private final String accountHolder;
    private final String toBankBin;
    private final List<String> categories;
    private final String transferReference;
    private final String description;
}
