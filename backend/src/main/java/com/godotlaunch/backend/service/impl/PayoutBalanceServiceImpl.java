package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.repository.PayoutGateway;
import com.godotlaunch.backend.service.PayoutBalanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PayoutBalanceServiceImpl implements PayoutBalanceService {

    private final PayoutGateway payoutGateway;

    @Override
    @Transactional(readOnly = true)
    public PayoutGatewayBalanceResponse getCurrentBalance() {
        return payoutGateway.getBalance();
    }
}
