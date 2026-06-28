package com.godotlaunch.backend.service.payout;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PayoutGatewayStatusResponse {
    private final String payoutId;
    private final String transferReference;
    private final String status;
    private final String providerReference;
    private final String processedAt;
    private final String failureReason;
}
