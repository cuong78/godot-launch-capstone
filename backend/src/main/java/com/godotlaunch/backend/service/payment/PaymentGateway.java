package com.godotlaunch.backend.service.payment;

public interface PaymentGateway {
    PaymentGatewayCreateResponse createPayment(PaymentGatewayCreateRequest request);
    PaymentGatewayStatusResponse getPaymentStatus(Long orderCode);
    PaymentGatewayStatusResponse cancelPayment(Long orderCode);
    PaymentGatewayWebhookResult verifyWebhook(Object payload);
}
