package com.godotlaunch.backend.service.impl;

import com.godotlaunch.backend.dto.response.PayoutGatewayBalanceResponse;
import com.godotlaunch.backend.repository.PayoutGateway;
import com.godotlaunch.backend.service.PayoutBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayoutBalanceServiceImpl implements PayoutBalanceService {

    private final PayoutGateway payoutGateway;

    @Override
    @Transactional(readOnly = true)
    public PayoutGatewayBalanceResponse getCurrentBalance() {
        try {
            return payoutGateway.getBalance();
        } catch (Exception e) {
            log.warn("Không thể kết nối PayOS Payout Balance (Cần đăng ký Whitelist IP trên my.payos.vn): {}", e.getMessage());
            return PayoutGatewayBalanceResponse.builder()
                    .accountNumber("PayOS Payout")
                    .accountName("Tài khoản Chi trả PayOS (Chưa Whitelist IP)")
                    .currency("VND")
                    .balance(BigDecimal.ZERO)
                    .status("ip_not_whitelisted")
                    .build();
        }
    }
}
