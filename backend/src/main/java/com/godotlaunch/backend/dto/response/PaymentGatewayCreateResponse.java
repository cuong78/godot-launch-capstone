package com.godotlaunch.backend.dto.response;

import com.godotlaunch.backend.entity.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentGatewayCreateResponse {
    private final Long orderCode;
    private final String paymentLinkId;
    private final String checkoutUrl;
    private final String qrCode;
    private final PaymentStatus status;
}
