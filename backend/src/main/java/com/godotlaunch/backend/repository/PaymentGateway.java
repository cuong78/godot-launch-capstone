package com.godotlaunch.backend.repository;

import com.godotlaunch.backend.dto.request.PaymentGatewayCreateRequest;
import com.godotlaunch.backend.dto.response.PaymentGatewayCreateResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayStatusResponse;
import com.godotlaunch.backend.dto.response.PaymentGatewayWebhookResult;

public interface PaymentGateway {
    PaymentGatewayCreateResponse createPayment(PaymentGatewayCreateRequest request);
    PaymentGatewayStatusResponse getPaymentStatus(Long orderCode);
    PaymentGatewayStatusResponse cancelPayment(Long orderCode);
    PaymentGatewayWebhookResult verifyWebhook(Object payload);
}
