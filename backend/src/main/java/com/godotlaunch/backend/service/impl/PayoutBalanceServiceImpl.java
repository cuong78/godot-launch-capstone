package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.service.PayoutBalanceService;
import com.godotlaunch.backend.service.payout.PayoutGateway;
import com.godotlaunch.backend.service.payout.PayoutGatewayBalanceResponse;
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
