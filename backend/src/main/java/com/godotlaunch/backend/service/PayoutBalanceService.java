package com.godotlaunch.backend.service;

import com.godotlaunch.backend.service.payout.PayoutGatewayBalanceResponse;

public interface PayoutBalanceService {
    PayoutGatewayBalanceResponse getCurrentBalance();
}
