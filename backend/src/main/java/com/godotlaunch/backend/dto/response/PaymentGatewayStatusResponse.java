package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentGatewayStatusResponse {
    private final Long orderCode;
    private final String paymentLinkId;
    private final PaymentStatus status;
    private final String transactionReference;
    private final String paidAt;
}
