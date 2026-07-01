package com.godotlaunch.backend.dto.response;

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
