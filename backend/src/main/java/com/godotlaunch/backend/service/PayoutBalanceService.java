package com.godotlaunch.backend.service;

import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;

public interface PayoutBalanceService {
    PayoutGatewayBalanceResponse getCurrentBalance();
}
