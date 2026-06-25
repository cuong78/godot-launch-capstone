package com.godotlaunch.backend.service.payment;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentGatewayCreateRequest {
    private final Long orderCode;
    private final Long amount;
    private final String buyerName;
    private final String buyerEmail;
    private final String itemName;
    private final String description;
    private final String returnUrl;
    private final String cancelUrl;
    private final Long expiredAt;
}
