package com.godotlaunch.backend.service.payout;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PayoutGatewayCreateResponse {
    private final String payoutId;
    private final String referenceId;
    private final String status;
    private final String providerReference;
    private final String createdAt;
}
