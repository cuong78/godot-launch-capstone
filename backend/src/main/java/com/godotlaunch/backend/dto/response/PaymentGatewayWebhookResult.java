package com.godotlaunch.backend.dto.response;

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
    private final boolean validationRequest;
}
