package com.godotlaunch.backend.service.payment;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentGatewayWebhookResult {
    private final Long orderCode;
    private final Long amount;
    private final String paymentLinkId;
    private final String transactionReference;
    private final String occurredAt;
}
