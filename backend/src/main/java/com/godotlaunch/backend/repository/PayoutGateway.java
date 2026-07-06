package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.dto.request.PayoutGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PayoutGatewayStatusResponse;

import java.util.Optional;

public interface PayoutGateway {
    PayoutGatewayCreateResponse createPayout(PayoutGatewayCreateRequest request);
    PayoutGatewayBalanceResponse getBalance();
    PayoutGatewayStatusResponse getStatus(String payoutId);

    // Tra cứu payout đã tạo trên PayOS theo referenceId — dùng để đối soát khi createPayout()
    // báo lỗi cục bộ (timeout/response bất thường) nhưng PayOS có thể đã thực sự tạo payout đó rồi.
    Optional<PayoutGatewayCreateResponse> findPayoutByReferenceId(String referenceId);
}
