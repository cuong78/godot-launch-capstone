package com.godotlaunch.backend.service.payout;

public interface PayoutGateway {
    PayoutGatewayCreateResponse createPayout(PayoutGatewayCreateRequest request);
    PayoutGatewayBalanceResponse getBalance();
    PayoutGatewayStatusResponse getStatus(String payoutId);
    PayoutGatewayFeeEstimateResponse estimateFee(PayoutGatewayCreateRequest request);
}
