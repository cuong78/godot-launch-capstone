package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayFeeEstimateResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayStatusResponse;

public interface PayoutGateway {
    PayoutGatewayCreateResponse createPayout(PayoutGatewayCreateRequest request);
    PayoutGatewayBalanceResponse getBalance();
    PayoutGatewayStatusResponse getStatus(String payoutId);
    PayoutGatewayFeeEstimateResponse estimateFee(PayoutGatewayCreateRequest request);
}
