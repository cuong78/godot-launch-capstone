package com.godotlaunch.backend.dto.response;

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
